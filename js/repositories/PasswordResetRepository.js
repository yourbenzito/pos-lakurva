/**
 * Password Reset Repository
 * Handles database operations for password reset attempts and logs
 */
class PasswordResetRepository extends BaseRepository {
    constructor() {
        super('passwordResets');
    }

    /**
     * Find reset attempts by user ID
     * @param {number} userId - User ID
     * @returns {Promise<Array>}
     */
    async findByUserId(userId) {
        const allAttempts = await this.findAll();
        return allAttempts.filter(attempt => attempt.userId === userId);
    }

    /**
     * Find recent reset attempts (within last 24 hours)
     * @param {string} ipAddress - IP address (optional, for offline apps use 'local')
     * @returns {Promise<Array>}
     */
    async findRecentAttempts(ipAddress = 'local') {
        const allAttempts = await this.findAll();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        return allAttempts.filter(attempt => {
            const isRecent = attempt.date >= oneDayAgo;
            const matchesIP = !ipAddress || attempt.ipAddress === ipAddress;
            return isRecent && matchesIP;
        });
    }

    /**
     * Count failed attempts in last hour
     * @param {string} ipAddress - IP address (optional)
     * @returns {Promise<number>}
     */
    async countRecentFailedAttempts(ipAddress = 'local') {
        const allAttempts = await this.findAll();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        return allAttempts.filter(attempt => {
            const isRecent = attempt.date >= oneHourAgo;
            const matchesIP = !ipAddress || attempt.ipAddress === ipAddress;
            const isFailed = !attempt.success;
            return isRecent && matchesIP && isFailed;
        }).length;
    }
}
