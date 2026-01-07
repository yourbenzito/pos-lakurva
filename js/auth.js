class AuthManager {
    static SESSION_KEY = 'pos_current_user';

    static async login(username, password) {
        const user = await User.authenticate(username, password);
        if (!user) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        const session = {
            id: user.id,
            username: user.username,
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
            <div id="login-screen" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 450px; width: 90%;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
                        <h1 style="color: #1f2937; margin-bottom: 0.5rem; font-size: 1.75rem;">POS Minimarket</h1>
                        <p style="color: #6b7280; font-size: 0.9rem;" id="login-subtitle">Inicia sesión o crea una cuenta</p>
                    </div>

                    <!-- Formulario de Inicio de Sesión -->
                    <form id="login-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500; font-size: 0.9rem;">Usuario</label>
                            <input type="text" id="login-username" autocomplete="username" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem; transition: border-color 0.2s;" placeholder="Ingresa tu usuario">
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500; font-size: 0.9rem;">Contraseña</label>
                            <input type="password" id="login-password" autocomplete="current-password" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem; transition: border-color 0.2s;" placeholder="Ingresa tu contraseña">
                        </div>

                        <div id="confirm-password-group" style="display: none;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500; font-size: 0.9rem;">Confirmar Contraseña</label>
                            <input type="password" id="confirm-password" autocomplete="new-password" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem; transition: border-color 0.2s;" placeholder="Confirma tu contraseña">
                        </div>

                        <div id="login-error" style="display: none; padding: 0.75rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: 0.5rem; color: #dc2626; font-size: 0.875rem;"></div>

                        <button type="submit" id="login-btn" style="padding: 0.875rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                            Iniciar Sesión
                        </button>

                        <div style="text-align: center; margin-top: 0.5rem;">
                            <button type="button" id="toggle-mode-btn" style="background: none; border: none; color: #667eea; cursor: pointer; font-size: 0.9rem; text-decoration: underline; padding: 0.5rem;">
                                ¿No tienes cuenta? Regístrate aquí
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loginHTML);

        const form = document.getElementById('login-form');
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const errorDiv = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');
        const toggleModeBtn = document.getElementById('toggle-mode-btn');
        const subtitle = document.getElementById('login-subtitle');

        let isRegisterMode = false;

        // Función para alternar entre login y registro
        toggleModeBtn.addEventListener('click', () => {
            isRegisterMode = !isRegisterMode;
            
            if (isRegisterMode) {
                // Modo Registro
                subtitle.textContent = 'Crea tu nueva cuenta';
                loginBtn.textContent = 'Crear Cuenta';
                toggleModeBtn.textContent = '¿Ya tienes cuenta? Inicia sesión aquí';
                confirmPasswordGroup.style.display = 'block';
                confirmPasswordInput.required = true;
                passwordInput.autocomplete = 'new-password';
                usernameInput.autocomplete = 'username';
            } else {
                // Modo Login
                subtitle.textContent = 'Inicia sesión o crea una cuenta';
                loginBtn.textContent = 'Iniciar Sesión';
                toggleModeBtn.textContent = '¿No tienes cuenta? Regístrate aquí';
                confirmPasswordGroup.style.display = 'none';
                confirmPasswordInput.required = false;
                passwordInput.autocomplete = 'current-password';
                usernameInput.autocomplete = 'username';
            }
            
            errorDiv.style.display = 'none';
            usernameInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            usernameInput.focus();
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

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
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
                loginBtn.textContent = 'Creando cuenta...';
                errorDiv.style.display = 'none';

                try {
                    // Verificar si el usuario ya existe
                    const users = await User.getAll();
                    const existingUser = users.find(u => u.username === username);
                    
                    if (existingUser) {
                        errorDiv.textContent = 'Este nombre de usuario ya está en uso';
                        errorDiv.style.display = 'block';
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Crear Cuenta';
                        return;
                    }

                    // Crear nuevo usuario
                    await User.create(username, password);
                    
                    // Iniciar sesión automáticamente
                    await AuthManager.login(username, password);
                    
                    document.getElementById('login-screen').remove();
                    
                    if (appDiv) appDiv.style.display = 'flex';
                    
                    showNotification(`¡Bienvenido ${username}! Cuenta creada exitosamente`, 'success');
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    
                } catch (error) {
                    errorDiv.textContent = 'Error al crear la cuenta: ' + error.message;
                    errorDiv.style.display = 'block';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Crear Cuenta';
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

        setTimeout(() => usernameInput.focus(), 100);
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
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">Usuario activo</div>
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
