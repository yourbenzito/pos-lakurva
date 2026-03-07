class AuthManager {
    static SESSION_KEY = 'pos_current_user';

    static async login(username, password) {
        const user = await User.authenticate(username, password);
        if (!user) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        // C8: Incluir rol en la sesión
        const effectiveRole = User.getEffectiveRole(user);

        const session = {
            id: user.id,
            username: user.username,
            role: effectiveRole,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return session;
    }

    static logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        window.location.reload();
    }

    static getCurrentUser() {
        const session = sessionStorage.getItem(this.SESSION_KEY);
        return session ? JSON.parse(session) : null;
    }

    static isAuthenticated() {
        return this.getCurrentUser() !== null;
    }

    static requireAuth() {
        if (!this.isAuthenticated()) {
            this.showLoginScreen();
            return false;
        }
        return true;
    }

    static showLoginScreen() {
        const appDiv = document.getElementById('app');
        const splashScreen = document.getElementById('splash-screen');

        if (appDiv) appDiv.style.display = 'none';
        if (splashScreen) splashScreen.style.display = 'none';

        const existingLogin = document.getElementById('login-screen');
        if (existingLogin) existingLogin.remove();

        const loginHTML = `
            <div id="login-screen" class="login-screen">
                <div class="login-panel">
                    <div class="login-content">
                        <div class="login-header">
                            <div class="login-header-icon">🛒</div>
                            <h1 class="login-title">POS Minimarket</h1>
                            <p class="login-subtitle" id="login-subtitle">Inicia sesión o crea una cuenta</p>
                        </div>

                        <form id="login-form" class="login-form">
                            <div id="business-name-group" style="display: none;" class="login-form-group">
                                <label class="login-label" for="login-business-name">🏪 Nombre de tu Negocio</label>
                                <input type="text" id="login-business-name" autocomplete="organization" class="login-input" placeholder="Ej: Minimarket Don Juan">
                                <small style="color: #9ca3af; font-size: 0.75rem;">Este nombre aparecerá en tus boletas y reportes</small>
                            </div>

                            <div class="login-form-group">
                                <label class="login-label" for="login-username">Usuario</label>
                                <input type="text" id="login-username" autocomplete="username" required class="login-input" placeholder="Ingresa tu usuario">
                            </div>

                            <div class="login-form-group">
                                <label class="login-label" for="login-password">Contraseña</label>
                                <input type="password" id="login-password" autocomplete="current-password" required class="login-input" placeholder="Ingresa tu contraseña">
                            </div>

                            <div id="confirm-password-group" style="display: none;" class="login-form-group">
                                <label class="login-label" for="confirm-password">Confirmar Contraseña</label>
                                <input type="password" id="confirm-password" autocomplete="new-password" class="login-input" placeholder="Confirma tu contraseña">
                            </div>

                            <div id="login-error" class="login-error" style="display: none;"></div>

                            <button type="submit" id="login-btn" class="login-button">
                                Iniciar Sesión
                            </button>

                            <div class="login-footer">
                                <button type="button" id="toggle-mode-btn" class="login-link">
                                    ¿No tienes cuenta? Regístrate aquí
                                </button>
                            </div>

                            <div class="login-divider"></div>

                            <div class="login-footer">
                                <button type="button" id="forgot-password-btn" class="login-link" onclick="return false;">
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </form>
                        
                        <form id="recover-password-form" class="login-form" style="display: none;">
                            <div class="recover-header">
                                <div class="login-header-icon">🔐</div>
                                <h2>Restablecer Contraseña</h2>
                                <p>Usa tu PIN de administrador o código de recuperación</p>
                            </div>
                            
                            <div class="login-form-group">
                                <label class="login-label" for="reset-username">Usuario *</label>
                                <input type="text" id="reset-username" autocomplete="username" required class="login-input" placeholder="Nombre de usuario">
                            </div>
                            
                            <div class="login-form-group">
                                <label class="login-label">Método de Restablecimiento *</label>
                                <div class="login-method-options">
                                    <label class="login-method-option active" id="method-pin-label">
                                        <input type="radio" name="reset-method" value="adminPIN" id="reset-method-pin" checked>
                                        <span>PIN Administrador</span>
                                    </label>
                                    <label class="login-method-option" id="method-code-label">
                                        <input type="radio" name="reset-method" value="recoveryCode" id="reset-method-code">
                                        <span>Código Recuperación</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div id="reset-pin-group" class="login-form-group">
                                <label class="login-label" for="reset-admin-pin">PIN de Administrador *</label>
                                <input type="password" id="reset-admin-pin" autocomplete="off" maxlength="8" required class="login-input" placeholder="PIN (4-8 dígitos)">
                                <small>PIN configurado por el administrador</small>
                            </div>
                            
                            <div id="reset-code-group" style="display: none;" class="login-form-group">
                                <label class="login-label" for="reset-recovery-code">Código de Recuperación *</label>
                                <input type="text" id="reset-recovery-code" autocomplete="off" class="login-input" placeholder="XXXX-XXXX-XXXX">
                                <small>Código generado previamente (formato: XXXX-XXXX-XXXX)</small>
                            </div>
                            
                            <div class="login-form-group">
                                <label class="login-label" for="recover-phone">Teléfono / PIN</label>
                                <input type="text" id="recover-phone" autocomplete="off" class="login-input" placeholder="Ej: +569XXXXXXXX" maxlength="20">
                                <small>Usa este dato para verificar tu identidad.</small>
                            </div>
                            
                            <div id="new-password-group" style="display: none;">
                                <div class="login-form-group">
                                    <label class="login-label" for="new-password">Nueva Contraseña *</label>
                                    <input type="password" id="new-password" autocomplete="new-password" class="login-input" placeholder="Nueva contraseña (mínimo 4 caracteres)">
                                </div>
                                
                                <div class="login-form-group">
                                    <label class="login-label" for="confirm-new-password">Confirmar Nueva Contraseña *</label>
                                    <input type="password" id="confirm-new-password" autocomplete="new-password" class="login-input" placeholder="Confirma la nueva contraseña">
                                </div>
                            </div>
                            
                            <div id="recover-error" class="login-error" style="display: none;"></div>
                            
                            <button type="submit" id="recover-btn" class="login-button">
                                Verificar y Continuar
                            </button>
                            
                            <div class="login-footer login-extra">
                                <button type="button" id="back-to-login-btn" class="login-link">
                                    ← Volver al inicio de sesión
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loginHTML);

        const form = document.getElementById('login-form');
        const businessNameInput = document.getElementById('login-business-name');
        const businessNameGroup = document.getElementById('business-name-group');
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const errorDiv = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');
        const toggleModeBtn = document.getElementById('toggle-mode-btn');
        const subtitle = document.getElementById('login-subtitle');
        const forgotPasswordBtn = document.getElementById('forgot-password-btn');
        const recoverPasswordForm = document.getElementById('recover-password-form');
        const backToLoginBtn = document.getElementById('back-to-login-btn');
        const resetUsernameInput = document.getElementById('reset-username');
        const resetMethodPin = document.getElementById('reset-method-pin');
        const resetMethodCode = document.getElementById('reset-method-code');
        const resetPinGroup = document.getElementById('reset-pin-group');
        const resetCodeGroup = document.getElementById('reset-code-group');
        const resetAdminPinInput = document.getElementById('reset-admin-pin');
        const resetRecoveryCodeInput = document.getElementById('reset-recovery-code');
        const newPasswordGroup = document.getElementById('new-password-group');
        const newPasswordInput = document.getElementById('new-password');
        const confirmNewPasswordInput = document.getElementById('confirm-new-password');
        const recoverErrorDiv = document.getElementById('recover-error');
        const recoverBtn = document.getElementById('recover-btn');
        const recoverPhoneInput = document.getElementById('recover-phone');

        let isRegisterMode = false;
        let isRecoverMode = false;
        let resetMethodVerified = false;

        // Función para alternar entre login y registro
        toggleModeBtn.addEventListener('click', () => {
            isRegisterMode = !isRegisterMode;

            if (isRegisterMode) {
                // Modo Registro
                subtitle.textContent = 'Registra tu negocio y crea tu cuenta';
                loginBtn.textContent = 'Crear Mi Negocio';
                toggleModeBtn.textContent = '¿Ya tienes cuenta? Inicia sesión aquí';
                confirmPasswordGroup.style.display = 'block';
                confirmPasswordInput.required = true;
                businessNameGroup.style.display = 'block';
                businessNameInput.required = true;
                passwordInput.autocomplete = 'new-password';
                usernameInput.autocomplete = 'username';
            } else {
                // Modo Login
                subtitle.textContent = 'Inicia sesión o crea una cuenta';
                loginBtn.textContent = 'Iniciar Sesión';
                toggleModeBtn.textContent = '¿No tienes cuenta? Regístrate aquí';
                confirmPasswordGroup.style.display = 'none';
                confirmPasswordInput.required = false;
                businessNameGroup.style.display = 'none';
                businessNameInput.required = false;
                passwordInput.autocomplete = 'current-password';
                usernameInput.autocomplete = 'username';
            }

            errorDiv.style.display = 'none';
            businessNameInput.value = '';
            usernameInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            if (isRegisterMode) businessNameInput.focus();
            else usernameInput.focus();
        });

        usernameInput.style.outline = 'none';
        passwordInput.style.outline = 'none';
        confirmPasswordInput.style.outline = 'none';

        usernameInput.addEventListener('focus', (e) => {
            e.target.style.borderColor = '#667eea';
        });
        usernameInput.addEventListener('blur', (e) => {
            e.target.style.borderColor = '#e5e7eb';
        });
        passwordInput.addEventListener('focus', (e) => {
            e.target.style.borderColor = '#667eea';
        });
        passwordInput.addEventListener('blur', (e) => {
            e.target.style.borderColor = '#e5e7eb';
        });
        confirmPasswordInput.addEventListener('focus', (e) => {
            e.target.style.borderColor = '#667eea';
        });
        confirmPasswordInput.addEventListener('blur', (e) => {
            e.target.style.borderColor = '#e5e7eb';
        });

        loginBtn.addEventListener('mouseenter', (e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';
        });
        loginBtn.addEventListener('mouseleave', (e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
        });

        // Prevenir que el formulario se envíe cuando se hace clic en el botón de recuperación
        // Nota: El botón ya tiene type="button" en el HTML, pero agregamos protección adicional
        if (form && forgotPasswordBtn) {
            // Asegurar que el botón no haga submit del formulario
            forgotPasswordBtn.type = 'button';

            form.addEventListener('submit', (e) => {
                if (isRecoverMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Si estamos en modo recuperación, no procesar el submit
            if (isRecoverMode) {
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!username || !password) {
                errorDiv.textContent = 'Por favor completa todos los campos';
                errorDiv.style.display = 'block';
                return;
            }

            if (isRegisterMode) {
                // MODO REGISTRO
                const businessName = businessNameInput.value.trim();

                if (!businessName) {
                    errorDiv.textContent = 'Por favor ingresa el nombre de tu negocio';
                    errorDiv.style.display = 'block';
                    return;
                }

                if (password !== confirmPassword) {
                    errorDiv.textContent = 'Las contraseñas no coinciden';
                    errorDiv.style.display = 'block';
                    return;
                }

                if (password.length < 4) {
                    errorDiv.textContent = 'La contraseña debe tener al menos 4 caracteres';
                    errorDiv.style.display = 'block';
                    return;
                }

                loginBtn.disabled = true;
                loginBtn.textContent = 'Creando negocio...';
                errorDiv.style.display = 'none';

                try {
                    // Si estamos en modo SQLite (servidor), usar el endpoint de registro
                    if (db.mode === 'sqlite' && window.ApiClient) {
                        const result = await window.ApiClient.post('auth/register', {
                            businessName: businessName,
                            username: username,
                            password: password
                        });

                        // Auto-login después del registro
                        await AuthManager.login(username, password);

                        document.getElementById('login-screen').remove();
                        if (appDiv) appDiv.style.display = 'flex';

                        showNotification(`¡Bienvenido! Tu negocio "${businessName}" fue creado exitosamente 🎉`, 'success');

                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    } else {
                        // Modo IndexedDB (local) - flujo original
                        const users = await User.getAll();
                        const existingUser = users.find(u => u.username === username);

                        if (existingUser) {
                            errorDiv.textContent = 'Este nombre de usuario ya está en uso';
                            errorDiv.style.display = 'block';
                            loginBtn.disabled = false;
                            loginBtn.textContent = 'Crear Mi Negocio';
                            return;
                        }

                        const newUser = await User.create(username, password);
                        await new Promise(resolve => setTimeout(resolve, 100));

                        const verifyUser = await User.findByUsername(username);
                        if (!verifyUser) {
                            throw new Error('Error: El usuario no se guardó correctamente.');
                        }

                        await AuthManager.login(username, password);
                        document.getElementById('login-screen').remove();
                        if (appDiv) appDiv.style.display = 'flex';

                        showNotification(`¡Bienvenido ${username}! Negocio "${businessName}" creado`, 'success');

                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    }

                } catch (error) {
                    errorDiv.textContent = 'Error al crear el negocio: ' + error.message;
                    errorDiv.style.display = 'block';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Crear Mi Negocio';
                }
            } else {
                // MODO LOGIN
                loginBtn.disabled = true;
                loginBtn.textContent = 'Iniciando sesión...';
                errorDiv.style.display = 'none';

                try {
                    await AuthManager.login(username, password);

                    document.getElementById('login-screen').remove();

                    if (appDiv) appDiv.style.display = 'flex';

                    window.location.reload();

                } catch (error) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Iniciar Sesión';
                }
            }
        });

        // Manejar cambio de método de restablecimiento
        if (resetMethodPin && resetMethodCode) {
            const updateResetMethod = () => {
                const usePIN = resetMethodPin.checked;
                resetPinGroup.style.display = usePIN ? 'block' : 'none';
                resetCodeGroup.style.display = usePIN ? 'none' : 'block';
                resetAdminPinInput.required = usePIN;
                resetRecoveryCodeInput.required = !usePIN;

                // Update label styles
                const pinLabel = document.getElementById('method-pin-label');
                const codeLabel = document.getElementById('method-code-label');
                if (pinLabel) {
                    pinLabel.classList.toggle('active', usePIN);
                }
                if (codeLabel) {
                    codeLabel.classList.toggle('active', !usePIN);
                }
            };

            resetMethodPin.addEventListener('change', updateResetMethod);
            resetMethodCode.addEventListener('change', updateResetMethod);
            updateResetMethod(); // Initial state
        }

        // Formatear código de recuperación mientras se escribe
        if (resetRecoveryCodeInput) {
            resetRecoveryCodeInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                if (value.length > 12) value = value.substring(0, 12);

                // Add dashes: XXXX-XXXX-XXXX
                if (value.length > 4) {
                    value = value.substring(0, 4) + '-' + value.substring(4);
                }
                if (value.length > 9) {
                    value = value.substring(0, 9) + '-' + value.substring(9);
                }

                e.target.value = value;
            });
        }

        // Manejar formulario de restablecimiento de contraseña
        // Usar setTimeout para asegurar que el DOM esté completamente listo
        setTimeout(() => {
            const forgotBtn = document.getElementById('forgot-password-btn');
            if (!forgotBtn) {
                console.error('Botón de recuperación de contraseña no encontrado');
                return;
            }

            // Asegurar que el botón no haga submit
            forgotBtn.type = 'button';

            const handleRecoverClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                console.log('Botón de recuperación clickeado'); // Debug

                const loginForm = document.getElementById('login-form');
                const recoverForm = document.getElementById('recover-password-form');

                if (!loginForm || !recoverForm) {
                    console.error('Formularios no encontrados', { loginForm: !!loginForm, recoverForm: !!recoverForm });
                    alert('Error: No se encontraron los formularios. Por favor recarga la página.');
                    return false;
                }

                isRecoverMode = true;
                resetMethodVerified = false;

                // Ocultar formulario de login y su cabecera compartida
                const loginHeader = document.querySelector('.login-header');
                if (loginHeader) loginHeader.style.display = 'none';
                loginForm.style.display = 'none';

                // Mostrar formulario de recuperación
                recoverForm.style.display = 'flex';

                // Resetear campos
                const resetUserInput = document.getElementById('reset-username');
                const resetPinInput = document.getElementById('reset-admin-pin');
                const resetCodeInput = document.getElementById('reset-recovery-code');
                const methodPinRadio = document.getElementById('reset-method-pin');
                const methodCodeRadio = document.getElementById('reset-method-code');
                const newPwdGroup = document.getElementById('new-password-group');
                const errorDiv = document.getElementById('recover-error');
                const recoverBtnEl = document.getElementById('recover-btn');

                if (resetUserInput) {
                    resetUserInput.value = '';
                    resetUserInput.disabled = false;
                }
                if (resetPinInput) {
                    resetPinInput.value = '';
                    resetPinInput.disabled = false;
                }
                if (resetCodeInput) {
                    resetCodeInput.value = '';
                    resetCodeInput.disabled = false;
                }
                if (methodPinRadio) methodPinRadio.disabled = false;
                if (methodCodeRadio) methodCodeRadio.disabled = false;
                if (newPwdGroup) {
                    newPwdGroup.style.display = 'none';
                    // Remover required cuando los campos están ocultos
                    const newPwdInput = document.getElementById('new-password');
                    const confirmPwdInput = document.getElementById('confirm-new-password');
                    if (newPwdInput) {
                        newPwdInput.required = false;
                    }
                    if (confirmPwdInput) {
                        confirmPwdInput.required = false;
                    }
                }
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                    errorDiv.style.background = '#fee2e2';
                    errorDiv.style.borderColor = '#fecaca';
                    errorDiv.style.color = '#dc2626';
                }
                if (recoverBtnEl) {
                    recoverBtnEl.textContent = 'Verificar y Continuar';
                    recoverBtnEl.disabled = false;
                }

                // Actualizar estado visual de los radio buttons
                if (methodPinRadio && methodCodeRadio) {
                    methodPinRadio.checked = true;
                    const pinGroup = document.getElementById('reset-pin-group');
                    const codeGroup = document.getElementById('reset-code-group');
                    if (pinGroup) pinGroup.style.display = 'block';
                    if (codeGroup) codeGroup.style.display = 'none';
                    if (resetPinInput) resetPinInput.required = true;
                    if (resetCodeInput) resetCodeInput.required = false;
                }

                setTimeout(() => {
                    if (resetUserInput) resetUserInput.focus();
                }, 150);

                return false;
            };

            // Agregar listener de forma robusta
            forgotBtn.addEventListener('click', handleRecoverClick, false);
            forgotBtn.onclick = handleRecoverClick;

            console.log('Listener de recuperación de contraseña agregado');
        }, 100);

        if (backToLoginBtn && form && recoverPasswordForm) {
            backToLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                isRecoverMode = false;
                resetMethodVerified = false;

                const loginHeader = document.querySelector('.login-header');
                if (loginHeader) loginHeader.style.display = 'flex';

                if (form) form.style.display = 'flex';
                if (recoverPasswordForm) recoverPasswordForm.style.display = 'none';
                if (newPasswordGroup) {
                    newPasswordGroup.style.display = 'none';
                    // Remover required cuando los campos están ocultos
                    if (newPasswordInput) {
                        newPasswordInput.required = false;
                    }
                    if (confirmNewPasswordInput) {
                        confirmNewPasswordInput.required = false;
                    }
                }

                if (resetUsernameInput) {
                    resetUsernameInput.disabled = false;
                    resetUsernameInput.value = '';
                }
                if (resetAdminPinInput) {
                    resetAdminPinInput.disabled = false;
                    resetAdminPinInput.value = '';
                }
                if (resetRecoveryCodeInput) {
                    resetRecoveryCodeInput.disabled = false;
                    resetRecoveryCodeInput.value = '';
                }
                if (resetMethodPin) resetMethodPin.disabled = false;
                if (resetMethodCode) resetMethodCode.disabled = false;

                if (newPasswordInput) newPasswordInput.value = '';
                if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';
                if (recoverErrorDiv) {
                    recoverErrorDiv.style.display = 'none';
                    recoverErrorDiv.style.background = '#fee2e2';
                    recoverErrorDiv.style.borderColor = '#fecaca';
                    recoverErrorDiv.style.color = '#dc2626';
                }
                if (recoverBtn) recoverBtn.textContent = 'Verificar y Continuar';
                if (subtitle) subtitle.textContent = 'Inicia sesión o crea una cuenta';

                setTimeout(() => {
                    if (usernameInput) usernameInput.focus();
                }, 100);
            });
        }

        // Manejar envío del formulario de restablecimiento
        if (recoverPasswordForm) {
            recoverPasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('📝 Formulario de recuperación enviado');
                console.log('resetMethodVerified:', resetMethodVerified);

                // Verificar que todos los elementos estén disponibles
                if (!resetUsernameInput || !resetAdminPinInput || !resetRecoveryCodeInput ||
                    !resetMethodPin || !resetMethodCode || !recoverBtn || !recoverErrorDiv) {
                    console.error('❌ Elementos del DOM no encontrados');
                    alert('Error: No se encontraron todos los elementos del formulario. Por favor recarga la página.');
                    return;
                }

                const username = resetUsernameInput.value.trim();
                const usePIN = resetMethodPin.checked;
                const pin = resetAdminPinInput.value.trim();
                const code = resetRecoveryCodeInput.value.trim().replace(/-/g, '').toUpperCase();

                console.log('📋 Datos del formulario:', { username, usePIN, hasPin: !!pin, hasCode: !!code });

                // Check rate limiting
                try {
                    const isRateLimited = await PasswordReset.isRateLimited('local');
                    if (isRateLimited) {
                        recoverErrorDiv.textContent = 'Demasiados intentos fallidos. Por favor espera 1 hora antes de intentar nuevamente.';
                        recoverErrorDiv.style.display = 'block';
                        return;
                    }
                } catch (rateLimitError) {
                    console.warn('⚠️ Error al verificar rate limiting:', rateLimitError);
                    // Continuar aunque falle el rate limiting
                }

                // Si aún no se ha verificado el método, verificarlo
                if (!resetMethodVerified) {
                    if (!username) {
                        recoverErrorDiv.textContent = 'Por favor ingresa el nombre de usuario';
                        recoverErrorDiv.style.display = 'block';
                        return;
                    }

                    if (usePIN && !pin) {
                        recoverErrorDiv.textContent = 'Por favor ingresa el PIN de administrador';
                        recoverErrorDiv.style.display = 'block';
                        return;
                    }

                    if (!usePIN && !code) {
                        recoverErrorDiv.textContent = 'Por favor ingresa el código de recuperación';
                        recoverErrorDiv.style.display = 'block';
                        return;
                    }

                    recoverBtn.disabled = true;
                    recoverBtn.textContent = 'Verificando...';
                    recoverErrorDiv.style.display = 'none';

                    try {
                        console.log('🔍 Iniciando verificación...', { username, usePIN, pin: pin ? '***' : 'vacío', codeLength: code.length });

                        const user = await User.findByUsername(username);
                        if (!user) {
                            console.error('❌ Usuario no encontrado:', username);
                            try {
                                await PasswordReset.logAttempt({
                                    userId: null,
                                    method: usePIN ? 'adminPIN' : 'recoveryCode',
                                    success: false,
                                    ipAddress: 'local',
                                    notes: `Usuario no encontrado: ${username}`
                                });
                            } catch (logError) {
                                console.warn('⚠️ Error al registrar intento:', logError);
                            }
                            recoverErrorDiv.style.background = '#fee2e2';
                            recoverErrorDiv.style.borderColor = '#fecaca';
                            recoverErrorDiv.style.color = '#dc2626';
                            recoverErrorDiv.textContent = '❌ Usuario no encontrado';
                            recoverErrorDiv.style.display = 'block';
                            recoverBtn.disabled = false;
                            recoverBtn.textContent = 'Verificar y Continuar';
                            return;
                        }

                        console.log('✅ Usuario encontrado:', user.username);

                        let isValid = false;
                        let verificationError = null;

                        if (usePIN) {
                            // Verify global admin PIN (works for any user)
                            console.log('🔐 Verificando PIN de administrador...');

                            try {
                                // Check if PIN is configured
                                const hasPIN = await User.hasAdminPIN();
                                if (!hasPIN) {
                                    console.error('❌ PIN de administrador no está configurado');
                                    recoverErrorDiv.style.background = '#fee2e2';
                                    recoverErrorDiv.style.borderColor = '#fecaca';
                                    recoverErrorDiv.style.color = '#dc2626';
                                    recoverErrorDiv.textContent = 'PIN de administrador no está configurado en el sistema. Por favor configura el PIN desde Configuración > Seguridad.';
                                    recoverErrorDiv.style.display = 'block';
                                    recoverBtn.disabled = false;
                                    recoverBtn.textContent = 'Verificar y Continuar';
                                    return;
                                }

                                isValid = await User.verifyAdminPIN(pin);
                                console.log('🔐 Resultado de verificación PIN:', isValid ? '✅ Válido' : '❌ Inválido');

                                if (!isValid) {
                                    console.error('❌ PIN incorrecto');
                                    try {
                                        await PasswordReset.logAttempt({
                                            userId: user.id,
                                            method: 'adminPIN',
                                            success: false,
                                            ipAddress: 'local',
                                            notes: 'PIN incorrecto'
                                        });
                                    } catch (logError) {
                                        console.warn('⚠️ Error al registrar intento:', logError);
                                    }
                                }
                            } catch (pinError) {
                                console.error('❌ Error al verificar PIN:', pinError);
                                verificationError = pinError;
                                isValid = false;
                            }
                        } else {
                            console.log('🔑 Verificando código de recuperación...');
                            try {
                                isValid = await User.verifyRecoveryCode(user.id, code);
                                console.log('🔑 Resultado de verificación código:', isValid ? '✅ Válido' : '❌ Inválido');

                                if (!isValid) {
                                    console.error('❌ Código incorrecto');
                                    try {
                                        await PasswordReset.logAttempt({
                                            userId: user.id,
                                            method: 'recoveryCode',
                                            success: false,
                                            ipAddress: 'local',
                                            notes: 'Código de recuperación incorrecto'
                                        });
                                    } catch (logError) {
                                        console.warn('⚠️ Error al registrar intento:', logError);
                                    }
                                }
                            } catch (codeError) {
                                console.error('❌ Error al verificar código:', codeError);
                                verificationError = codeError;
                                isValid = false;
                            }
                        }

                        // Si hubo un error durante la verificación, mostrarlo
                        if (verificationError) {
                            throw verificationError;
                        }

                        if (!isValid) {
                            console.log('❌ Verificación fallida');
                            recoverErrorDiv.style.background = '#fee2e2';
                            recoverErrorDiv.style.borderColor = '#fecaca';
                            recoverErrorDiv.style.color = '#dc2626';
                            recoverErrorDiv.textContent = usePIN ? '❌ PIN de administrador incorrecto' : '❌ Código de recuperación incorrecto';
                            recoverErrorDiv.style.display = 'block';
                            recoverBtn.disabled = false;
                            recoverBtn.textContent = 'Verificar y Continuar';
                            return;
                        }

                        console.log('✅ Verificación exitosa, mostrando formulario de nueva contraseña');

                        // Método verificado correctamente
                        resetMethodVerified = true;
                        console.log('resetMethodVerified actualizado a:', resetMethodVerified);

                        // Mostrar campo de nueva contraseña
                        if (newPasswordGroup) {
                            newPasswordGroup.style.display = 'block';
                            // Agregar required solo cuando los campos son visibles
                            if (newPasswordInput) {
                                newPasswordInput.required = true;
                            }
                            if (confirmNewPasswordInput) {
                                confirmNewPasswordInput.required = true;
                            }
                            console.log('✅ Campo de nueva contraseña mostrado');
                        } else {
                            console.error('❌ newPasswordGroup no encontrado');
                        }

                        // Deshabilitar campos de entrada
                        if (resetUsernameInput) {
                            resetUsernameInput.disabled = true;
                            console.log('✅ Username deshabilitado');
                        }
                        if (resetAdminPinInput) {
                            resetAdminPinInput.disabled = true;
                            console.log('✅ PIN input deshabilitado');
                        }
                        if (resetRecoveryCodeInput) {
                            resetRecoveryCodeInput.disabled = true;
                            console.log('✅ Recovery code input deshabilitado');
                        }
                        if (resetMethodPin) {
                            resetMethodPin.disabled = true;
                            console.log('✅ Method PIN radio deshabilitado');
                        }
                        if (resetMethodCode) {
                            resetMethodCode.disabled = true;
                            console.log('✅ Method code radio deshabilitado');
                        }

                        // Actualizar botón
                        if (recoverBtn) {
                            recoverBtn.textContent = 'Restablecer Contraseña';
                            recoverBtn.disabled = false;
                            console.log('✅ Botón actualizado a "Restablecer Contraseña"');
                        } else {
                            console.error('❌ recoverBtn no encontrado');
                        }

                        // Log successful verification
                        try {
                            await PasswordReset.logAttempt({
                                userId: user.id,
                                method: usePIN ? 'adminPIN' : 'recoveryCode',
                                success: true,
                                ipAddress: 'local',
                                notes: 'Método de recuperación verificado correctamente'
                            });
                        } catch (logError) {
                            console.warn('⚠️ Error al registrar intento exitoso:', logError);
                        }

                        // Show success message
                        if (recoverErrorDiv) {
                            recoverErrorDiv.style.background = '#dcfce7';
                            recoverErrorDiv.style.borderColor = '#86efac';
                            recoverErrorDiv.style.color = '#166534';
                            recoverErrorDiv.textContent = '✅ ' + (usePIN ? 'PIN verificado correctamente' : 'Código de recuperación verificado correctamente') + '. Ingresa tu nueva contraseña.';
                            recoverErrorDiv.style.display = 'block';
                            console.log('✅ Mensaje de éxito mostrado');
                        } else {
                            console.error('❌ recoverErrorDiv no encontrado');
                        }

                        setTimeout(() => {
                            if (newPasswordInput) {
                                newPasswordInput.focus();
                                console.log('✅ Focus en campo de nueva contraseña');
                            } else {
                                console.error('❌ newPasswordInput no encontrado');
                            }
                        }, 100);

                    } catch (error) {
                        console.error('❌ Error durante la verificación:', error);
                        if (recoverErrorDiv) {
                            recoverErrorDiv.style.background = '#fee2e2';
                            recoverErrorDiv.style.borderColor = '#fecaca';
                            recoverErrorDiv.style.color = '#dc2626';
                            recoverErrorDiv.textContent = 'Error: ' + error.message;
                            recoverErrorDiv.style.display = 'block';
                        }
                        if (recoverBtn) {
                            recoverBtn.disabled = false;
                            recoverBtn.textContent = 'Verificar y Continuar';
                        }
                    }

                    return;
                }

                // Si ya se verificó el método, cambiar la contraseña
                const newPassword = newPasswordInput.value;
                const confirmPassword = confirmNewPasswordInput.value;

                if (!newPassword || !confirmPassword) {
                    recoverErrorDiv.textContent = 'Por favor completa todos los campos';
                    recoverErrorDiv.style.display = 'block';
                    return;
                }

                if (newPassword !== confirmPassword) {
                    recoverErrorDiv.textContent = 'Las contraseñas no coinciden';
                    recoverErrorDiv.style.display = 'block';
                    return;
                }

                if (newPassword.length < 4) {
                    recoverErrorDiv.textContent = 'La contraseña debe tener al menos 4 caracteres';
                    recoverErrorDiv.style.display = 'block';
                    return;
                }

                recoverBtn.disabled = true;
                recoverBtn.textContent = 'Restableciendo contraseña...';
                recoverErrorDiv.style.display = 'none';

                try {
                    const user = await User.findByUsername(username);
                    if (!user) {
                        throw new Error('Usuario no encontrado');
                    }

                    const usePIN = resetMethodPin.checked;
                    const pin = resetAdminPinInput.value.trim();
                    const code = resetRecoveryCodeInput.value.trim().replace(/-/g, '').toUpperCase();

                    let updatedUser;
                    if (usePIN) {
                        updatedUser = await User.resetPasswordWithPIN(username, pin, newPassword);
                    } else {
                        updatedUser = await User.resetPasswordWithCode(username, code, newPassword);
                    }

                    // Log successful reset
                    await PasswordReset.logAttempt({
                        userId: updatedUser.id,
                        method: usePIN ? 'adminPIN' : 'recoveryCode',
                        success: true,
                        ipAddress: 'local',
                        notes: 'Contraseña restablecida exitosamente'
                    });

                    recoverErrorDiv.style.background = '#dcfce7';
                    recoverErrorDiv.style.borderColor = '#86efac';
                    recoverErrorDiv.style.color = '#166534';
                    recoverErrorDiv.textContent = '¡Contraseña restablecida exitosamente! Redirigiendo al inicio de sesión...';
                    recoverErrorDiv.style.display = 'block';

                    // Esperar 2 segundos y volver al login
                    setTimeout(() => {
                        backToLoginBtn.click();
                        showNotification('Contraseña restablecida. Ahora puedes iniciar sesión con tu nueva contraseña', 'success');
                    }, 2000);

                } catch (error) {
                    recoverErrorDiv.style.background = '#fee2e2';
                    recoverErrorDiv.style.borderColor = '#fecaca';
                    recoverErrorDiv.style.color = '#dc2626';
                    recoverErrorDiv.textContent = 'Error: ' + error.message;
                    recoverErrorDiv.style.display = 'block';
                    recoverBtn.disabled = false;
                    recoverBtn.textContent = 'Restablecer Contraseña';
                }
            });
        }

        // Estilos para inputs de recuperación
        if (recoverPhoneInput) recoverPhoneInput.style.outline = 'none';
        if (newPasswordInput) newPasswordInput.style.outline = 'none';
        if (confirmNewPasswordInput) confirmNewPasswordInput.style.outline = 'none';

        if (newPasswordInput) {
            newPasswordInput.addEventListener('focus', (e) => {
                e.target.style.borderColor = '#667eea';
            });
            newPasswordInput.addEventListener('blur', (e) => {
                e.target.style.borderColor = '#e5e7eb';
            });
        }

        if (confirmNewPasswordInput) {
            confirmNewPasswordInput.addEventListener('focus', (e) => {
                e.target.style.borderColor = '#667eea';
            });
            confirmNewPasswordInput.addEventListener('blur', (e) => {
                e.target.style.borderColor = '#e5e7eb';
            });
        }

        if (recoverBtn) {
            recoverBtn.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';
            });
            recoverBtn.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
            });
        }

        setTimeout(() => usernameInput.focus(), 100);
    }

    static showRecoverPassword() {
        try {
            const form = document.getElementById('login-form');
            const recoverPasswordForm = document.getElementById('recover-password-form');
            const subtitle = document.getElementById('login-subtitle');
            const recoverPhoneInput = document.getElementById('recover-phone');
            const newPasswordGroup = document.getElementById('new-password-group');
            const recoverErrorDiv = document.getElementById('recover-error');
            const recoverBtn = document.getElementById('recover-btn');

            if (!form || !recoverPasswordForm) {
                console.error('Elementos de recuperación no encontrados', {
                    form: !!form,
                    recoverPasswordForm: !!recoverPasswordForm
                });
                return false;
            }

            // Ocultar formulario de login
            form.style.display = 'none';

            // Mostrar formulario de recuperación
            recoverPasswordForm.style.display = 'flex';

            // Actualizar título
            if (subtitle) subtitle.textContent = 'Recuperar contraseña';

            // Resetear campos
            if (recoverPhoneInput) {
                recoverPhoneInput.disabled = false;
                recoverPhoneInput.value = '';
            }

            if (newPasswordGroup) newPasswordGroup.style.display = 'none';
            if (recoverErrorDiv) {
                recoverErrorDiv.style.display = 'none';
                recoverErrorDiv.style.background = '#fee2e2';
                recoverErrorDiv.style.borderColor = '#fecaca';
                recoverErrorDiv.style.color = '#dc2626';
            }

            if (recoverBtn) {
                recoverBtn.textContent = 'Buscar Usuario';
                recoverBtn.disabled = false;
            }

            // Resetear estado global
            window.isRecoverMode = true;
            window.foundUserForRecovery = null;

            // Enfocar input de teléfono
            setTimeout(() => {
                if (recoverPhoneInput) {
                    recoverPhoneInput.focus();
                    recoverPhoneInput.select();
                }
            }, 150);

            return false; // Prevenir cualquier acción por defecto
        } catch (error) {
            console.error('Error al mostrar recuperación de contraseña:', error);
            return false;
        }
    }

    static addLogoutButton() {
        const user = this.getCurrentUser();
        if (!user) return;

        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const existingUserInfo = document.getElementById('user-info-section');
        if (existingUserInfo) return;

        const userInfoHTML = `
            <div id="user-info-section" style="padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1); margin-top: auto;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.1); border-radius: 0.5rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9rem; color: white; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.username}</div>
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">${(typeof PermissionService !== 'undefined' && user.role) ? PermissionService.ROLE_LABELS[user.role] || user.role : 'Usuario activo'}</div>
                    </div>
                </div>
                <button onclick="AuthManager.logout()" class="btn btn-danger btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <span>🚪</span>
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        `;

        const networkStatus = sidebar.querySelector('#network-status')?.parentElement;
        if (networkStatus) {
            networkStatus.insertAdjacentHTML('beforebegin', userInfoHTML);
        }
    }
}
