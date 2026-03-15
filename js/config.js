const API_CONFIG = {
    get BASE_URL() {
        // En la nube (cajafacil.cl) con HTTPS o cualquier dominio externo
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return `${window.location.protocol}//${window.location.host}`;
        }
        // En local, para el desarrollo en Electron o Navegador local
        return 'http://localhost:3000';
    },

    get API_URL() {
        return `${this.BASE_URL}/api`;
    }
};

window.API_CONFIG = API_CONFIG;
