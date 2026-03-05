const ApiClient = {
    async get(endpoint, params = {}) {
        const url = new URL(`${window.API_CONFIG.API_URL}/${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${window.API_CONFIG.API_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) errorMsg = errorData.error;
            } catch (e) { }
            throw new Error(`API Error: ${errorMsg}`);
        }
        return await response.json();
    },

    async put(endpoint, id, data) {
        const response = await fetch(`${window.API_CONFIG.API_URL}/${endpoint}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    },

    async delete(endpoint, id) {
        const response = await fetch(`${window.API_CONFIG.API_URL}/${endpoint}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    }
};

window.ApiClient = ApiClient;
