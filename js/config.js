const API_CONFIG = {
    get BASE_URL() {
        // En la nube (Railway/Render) no usamos puerto 3000 manual
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return `${window.location.protocol}//${window.location.host}`;
        }
        // En local, forzamos el puerto 3000 del backend
        return 'http://localhost:3000';
    },

    get API_URL() {
        return `${this.BASE_URL}/api`;
    }
};

window.API_CONFIG = API_CONFIG;
