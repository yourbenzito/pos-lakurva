const API_CONFIG = {
    get BASE_URL() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // Si estamos en la nube (producción/HTTPS)
        if (protocol === 'https:' || (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.'))) {
            return `${protocol}//${hostname}`;
        }

        // En local (Computador o Red Local), forzamos HTTP y puerto 3000
        const host = hostname || 'localhost';
        return `http://${host}:3000`;
    },

    get API_URL() {
        return `${this.BASE_URL}/api`;
    }
};

window.API_CONFIG = API_CONFIG;
