const ApiClient = {
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('AUTH_TOKEN');
        const businessId = localStorage.getItem('BUSINESS_ID');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (businessId) headers['x-business-id'] = businessId;
        return headers;
    },

    async get(endpoint, params = {}) {
        const url = new URL(`${window.API_CONFIG.API_URL}/${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        if (!response.ok) await this.handleError(response);
        return await response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${window.API_CONFIG.API_URL}/${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) await this.handleError(response);
        return await response.json();
    },

    async put(endpoint, id, data) {
        const url = id ? `${window.API_CONFIG.API_URL}/${endpoint}/${id}` : `${window.API_CONFIG.API_URL}/${endpoint}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) await this.handleError(response);
        return await response.json();
    },

    async delete(endpoint, id) {
        const response = await fetch(`${window.API_CONFIG.API_URL}/${endpoint}/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) await this.handleError(response);
        return await response.json();
    },

    async handleError(response) {
        let errorMsg = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) errorMsg = errorData.error;
        } catch (e) { }

        if (response.status === 401) {
            console.warn('Sesión expirada o inválida');
            // Podríamos redirigir al login aquí si no estamos ya en él
        }

        throw new Error(errorMsg);
    }
};

window.ApiClient = ApiClient;
