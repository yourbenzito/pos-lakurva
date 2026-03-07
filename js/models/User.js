class User {
    static async create(username, password, phone = null, role = 'cashier') {
        try {
            const users = await db.getAll('users');
            const trimmedUsername = username.trim();

            // Verificar si el usuario ya existe
            const existingUser = users.find(u => u.username && u.username.trim().toLowerCase() === trimmedUsername.toLowerCase());
            if (existingUser) {
                throw new Error('Este nombre de usuario ya está en uso');
            }

            // Validar formato de teléfono si se proporciona
            if (phone && !this.validatePhone(phone)) {
                throw new Error('El teléfono debe tener el formato +569XXXXXXXX');
            }

            if (!password || password.length < 4) {
                throw new Error('La contraseña debe tener al menos 4 caracteres');
            }

            const hashedPassword = await this.hashPassword(password);

            // C8: Si es el primer usuario real (excluyendo admin si ya existe) o no hay usuarios
            const actualUsers = users.filter(u => u.username !== 'admin');
            const validRole = PermissionService.isValidRole(role) ? role : 'cashier';

            // Si no hay usuarios en absoluto, o solo está el admin por defecto, 
            // y el nuevo usuario tiene un nombre "fuerte" o es el primero creado por el usuario, darle owner.
            const finalRole = users.length === 0 ? 'owner' : validRole;

            const userData = {
                username: trimmedUsername,
                password: hashedPassword,
                phone: phone ? this.normalizePhone(phone) : null,
                role: finalRole,
                createdAt: new Date().toISOString()
            };

            console.log('[User] Creando usuario:', { username: trimmedUsername, passwordHash: hashedPassword.substring(0, 20) + '...' });

            const id = await db.add('users', userData);

            // Verificar que se guardó correctamente
            // Nota: db.add ya debe devolver solo el id (corregido en db.js)
            const resolvedId = (id && typeof id === 'object') ? id.id : id;
            // Re-intentar obtener el usuario un par de veces si falla (para evitar race conditions)
            let savedUser = await db.get('users', resolvedId);
            if (!savedUser) {
                await new Promise(r => setTimeout(r, 100));
                savedUser = await db.get('users', resolvedId);
            }

            if (!savedUser && (resolvedId !== null && resolvedId !== undefined)) {
                // Si tenemos un ID, asumimos que se guardó a pesar de que .get fallara momentáneamente
                console.warn('[User] Advertencia de verificación: savedUser es null pero se obtuvo ID:', resolvedId);
                return { id: resolvedId, ...userData };
            }

            if (!savedUser) {
                console.error('[User] Error de verificación: ID obtenido:', resolvedId);
                throw new Error('Error: El usuario no se guardó correctamente. Por favor intenta nuevamente.');
            }

            console.log('[User] Usuario creado exitosamente con ID:', resolvedId);
            return { id: resolvedId, ...userData };
        } catch (error) {
            console.error('[User] Error al crear usuario:', error);
            throw error;
        }
    }

    static validatePhone(phone) {
        // Validar formato chileno: +569 seguido de 8 dígitos
        const phoneRegex = /^\+569\d{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    static normalizePhone(phone) {
        // Normalizar el teléfono eliminando espacios y guiones
        let normalized = phone.replace(/[\s\-]/g, '');

        // Si no empieza con +569, agregarlo
        if (!normalized.startsWith('+569')) {
            // Si empieza con 9, agregar +56
            if (normalized.startsWith('9') && normalized.length === 9) {
                normalized = '+56' + normalized;
            }
            // Si empieza con 569, agregar +
            else if (normalized.startsWith('569') && normalized.length === 11) {
                normalized = '+' + normalized;
            }
        }

        return normalized;
    }

    static async findByPhone(phone) {
        const normalizedPhone = this.normalizePhone(phone);
        // Intentar buscar por índice primero (más eficiente)
        try {
            const users = await db.getByIndex('users', 'phone', normalizedPhone);
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            // Si el índice no existe aún, buscar manualmente
            const users = await db.getAll('users');
            return users.find(u => u.phone === normalizedPhone);
        }
    }

    static async findByUsername(username) {
        try {
            const users = await db.getAll('users');
            const trimmedUsername = username.trim();
            const user = users.find(u => {
                if (!u || !u.username) return false;
                // FASE E: Match estricto respetando mayúsculas/minúsculas para evitar robo de cuentas admin.
                return u.username.trim() === trimmedUsername;
            });
            return user || null;
        } catch (error) {
            console.error('[User] Error en findByUsername:', error);
            return null;
        }
    }

    static async resetPassword(phone, newPassword) {
        const user = await this.findByPhone(phone);
        if (!user) {
            throw new Error('No se encontró un usuario con ese número de teléfono');
        }

        return await this.update(user.id, { password: newPassword });
    }

    static async authenticate(username, password) {
        try {
            // Si estamos en modo SQLite (Servidor), usamos el nuevo endpoint de Auth
            if (db.mode === 'sqlite' && window.ApiClient) {
                console.log(`[Auth] Autenticando vía servidor para: ${username}`);
                try {
                    const result = await window.ApiClient.post('auth/login', { username, password });

                    // Guardar datos de sesión
                    localStorage.setItem('AUTH_TOKEN', result.token);
                    localStorage.setItem('BUSINESS_ID', result.user.business_id);
                    localStorage.setItem('CURRENT_BUSINESS', JSON.stringify(result.business));

                    console.log(`[Auth] Login exitoso vía servidor.`);
                    return result.user;
                } catch (error) {
                    console.warn('[Auth] Error en login de servidor:', error.message);
                    return null;
                }
            }

            // Fallback para IndexedDB (modo local/offline)
            const users = await db.getAll('users');
            const trimmedUsername = username.trim().toLowerCase();
            const user = users.find(u => {
                if (!u || !u.username) return false;
                return u.username.trim().toLowerCase() === trimmedUsername;
            });

            if (!user) {
                console.log(`[Auth] Usuario no encontrado localmente: ${username}`);
                return null;
            }

            const isValid = await this.verifyPassword(password, user.password);
            if (!isValid) {
                console.log(`[Auth] Contraseña incorrecta localmente: ${username}`);
                return null;
            }

            console.log(`[Auth] Autenticación local exitosa: ${username}`);
            // En modo local, el business_id por defecto es 1
            localStorage.setItem('BUSINESS_ID', user.business_id || 1);

            return user;
        } catch (error) {
            console.error('[Auth] Error en authenticate:', error);
            throw error;
        }
    }

    static async hashPassword(password) {
        try {
            // Intento 1: Web Crypto API (Solo en contextos seguros: localhost o HTTPS)
            if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
                const encoder = new TextEncoder();
                const data = encoder.encode(password);
                const hash = await crypto.subtle.digest('SHA-256', data);
                return Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            }

            // Intento 2: Fallback al servidor (Para celulares/tablets en modo HTTP)
            if (window.ApiClient) {
                console.log('[Auth] crypto.subtle no disponible, usando hash del servidor...');
                const result = await window.ApiClient.post('utils/hash', { value: password });
                return result.hash;
            }

            throw new Error('No hay método de encriptación disponible');
        } catch (error) {
            console.error('[User] Error en hashPassword:', error);
            throw error;
        }
    }

    static async verifyPassword(password, hash) {
        const hashedInput = await this.hashPassword(password);
        return hashedInput === hash;
    }

    static async update(id, data) {
        const user = await db.get('users', id);
        if (!user) return null;

        if (data.password) {
            data.password = await this.hashPassword(data.password);
        }

        if (data.phone) {
            if (!this.validatePhone(data.phone)) {
                throw new Error('El teléfono debe tener el formato +569XXXXXXXX');
            }
            data.phone = this.normalizePhone(data.phone);
        }

        const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
        await db.put('users', updated);
        return updated;
    }

    static async getAll() {
        return await db.getAll('users');
    }

    static async count() {
        return await db.count('users');
    }

    static async initializeDefaultUser() {
        try {
            const count = await this.count();
            if (count === 0) {
                // C8: Primer usuario = owner
                await this.create('admin', 'admin123', null, 'owner');
                console.log('✅ Usuario por defecto creado: admin/admin123 (role: owner)');
            } else {
                // Verificar que al menos un usuario tenga rol 'owner'
                const users = await db.getAll('users');
                const hasOwner = users.some(u => (u.role === 'owner') || (!u.role)); // Usuarios sin rol son tratados como owner
                if (!hasOwner && users.length > 0) {
                    console.log('⚠️ No se detectó ningún Propietario. Promoviendo al primer usuario...');
                    await this.update(users[0].id, { role: 'owner' });
                }
            }
        } catch (error) {
            console.error('[User] Error en initializeDefaultUser:', error);
        }
    }

    /**
     * C8: Actualizar rol de un usuario.
     * Solo el owner puede cambiar roles.
     * @param {number} userId
     * @param {string} newRole - 'owner' | 'admin' | 'cashier'
     * @returns {Promise<Object>}
     */
    static async updateRole(userId, newRole) {
        if (!PermissionService.isValidRole(newRole)) {
            throw new Error(`Rol inválido: ${newRole}`);
        }
        const user = await this.getById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        const updated = await this.update(userId, { role: newRole });

        // C2: Audit log
        AuditLogService.log({
            entity: 'user', entityId: userId, action: 'updateRole',
            summary: `Rol actualizado: "${user.username}" → ${newRole}`,
            metadata: { username: user.username, oldRole: user.role || 'sin rol', newRole }
        });

        return updated;
    }

    /**
     * C8: Obtener el rol efectivo de un usuario.
     * Si no tiene rol asignado (pre-C8), retorna 'owner' para compatibilidad.
     * @param {Object} user
     * @returns {string}
     */
    static getEffectiveRole(user) {
        if (user && user.role && PermissionService.isValidRole(user.role)) {
            return user.role;
        }
        return 'owner'; // compatibilidad con usuarios creados antes de C8
    }

    static async getById(id) {
        return await db.get('users', id);
    }

    static async updatePhone(userId, phone) {
        return await this.update(userId, { phone });
    }

    /**
     * Hash a value (PIN or recovery code) using SHA-256
     * @param {string} value - Value to hash
     * @returns {Promise<string>} - Hashed value
     */
    static async hashValue(value) {
        return await this.hashPassword(value);
    }

    /**
     * Verify a value against hash
     * @param {string} value - Plain text value
     * @param {string} hash - Hashed value
     * @returns {Promise<boolean>} - True if value matches
     */
    static async verifyValue(value, hash) {
        return await this.verifyPassword(value, hash);
    }

    /**
     * Generate a secure recovery code
     * Format: XXXX-XXXX-XXXX (12 characters, alphanumeric)
     * @returns {string} - Recovery code
     */
    static generateRecoveryCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
        const segments = [4, 4, 4];
        return segments.map(len => {
            let segment = '';
            for (let i = 0; i < len; i++) {
                segment += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return segment;
        }).join('-');
    }

    /**
     * Set global admin PIN (system-wide, not per-user)
     * @param {string} pin - PIN (4-8 digits)
     * @returns {Promise<void>}
     */
    static async setAdminPIN(pin) {
        if (!/^\d{4,8}$/.test(pin)) {
            throw new Error('El PIN debe tener entre 4 y 8 dígitos');
        }
        const hashedPIN = await this.hashValue(pin);

        // Store in settings table
        try {
            await db.put('settings', { key: 'adminPIN', value: hashedPIN });
        } catch (error) {
            console.error('Error saving admin PIN:', error);
            throw new Error('Error al guardar el PIN: ' + error.message);
        }
    }

    /**
     * Get global admin PIN hash
     * @returns {Promise<string|null>} - Hashed PIN or null
     */
    static async getAdminPIN() {
        try {
            const setting = await db.get('settings', 'adminPIN');
            return setting ? setting.value : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Verify global admin PIN (system-wide, works for any user)
     * @param {string} pin - PIN to verify
     * @returns {Promise<boolean>} - True if PIN is correct
     */
    static async verifyAdminPIN(pin) {
        const hashedPIN = await this.getAdminPIN();
        if (!hashedPIN) {
            return false;
        }
        return await this.verifyValue(pin, hashedPIN);
    }

    /**
     * Check if admin PIN is configured
     * @returns {Promise<boolean>} - True if PIN is configured
     */
    static async hasAdminPIN() {
        const hashedPIN = await this.getAdminPIN();
        return hashedPIN !== null;
    }

    /**
     * Generate and set recovery code for a user
     * @param {number} userId - User ID
     * @returns {Promise<{code: string, user: Object}>} - Recovery code and updated user
     */
    static async generateAndSetRecoveryCode(userId) {
        const code = this.generateRecoveryCode();
        const hashedCode = await this.hashValue(code);
        const user = await this.update(userId, { recoveryCode: hashedCode, recoveryCodeGeneratedAt: new Date().toISOString() });
        return { code, user };
    }

    /**
     * Verify recovery code
     * @param {number} userId - User ID
     * @param {string} code - Recovery code to verify
     * @returns {Promise<boolean>} - True if code is correct
     */
    static async verifyRecoveryCode(userId, code) {
        const user = await this.getById(userId);
        if (!user || !user.recoveryCode) {
            return false;
        }
        // Normalize code (remove dashes and convert to uppercase)
        const normalizedCode = code.replace(/-/g, '').toUpperCase();
        // Verify against hashed stored code
        return await this.verifyValue(normalizedCode, user.recoveryCode);
    }

    /**
     * Reset password using global admin PIN (works for any user)
     * @param {string} username - Username whose password to reset
     * @param {string} adminPIN - Global admin PIN
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} - Updated user
     */
    static async resetPasswordWithPIN(username, adminPIN, newPassword) {
        const user = await this.findByUsername(username.trim());
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verify against global admin PIN (not user-specific)
        const isValidPIN = await this.verifyAdminPIN(adminPIN);
        if (!isValidPIN) {
            throw new Error('PIN de administrador incorrecto');
        }

        if (newPassword.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }

        // update() method already hashes the password, so pass it as plain text
        const updated = await this.update(user.id, { password: newPassword });
        console.log('✅ Contraseña actualizada exitosamente para usuario:', username);
        return updated;
    }

    /**
     * Reset password using recovery code
     * @param {string} username - Username
     * @param {string} recoveryCode - Recovery code
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} - Updated user
     */
    static async resetPasswordWithCode(username, recoveryCode, newPassword) {
        const user = await this.findByUsername(username.trim());
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const isValidCode = await this.verifyRecoveryCode(user.id, recoveryCode);
        if (!isValidCode) {
            throw new Error('Código de recuperación incorrecto');
        }

        if (newPassword.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }

        // Clear recovery code after successful use
        const updated = await this.update(user.id, {
            password: newPassword,
            recoveryCode: null,
            recoveryCodeGeneratedAt: null
        });

        return updated;
    }
}
