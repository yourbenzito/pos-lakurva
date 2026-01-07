class User {
    static async create(username, password) {
        const users = await db.getAll('users');
        
        const hashedPassword = await this.hashPassword(password);
        
        const userData = {
            username: username.trim(),
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        const id = await db.add('users', userData);
        return { id, ...userData };
    }

    static async authenticate(username, password) {
        const users = await db.getAll('users');
        const user = users.find(u => u.username === username.trim());
        
        if (!user) {
            return null;
        }
        
        const isValid = await this.verifyPassword(password, user.password);
        if (!isValid) {
            return null;
        }
        
        return user;
    }

    static async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
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
        const count = await this.count();
        if (count === 0) {
            await this.create('admin', 'admin123');
            console.log('Usuario por defecto creado: admin/admin123');
        }
    }
}
