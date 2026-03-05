/**
 * Stub to satisfy legacy references - la función real de fixCashMovementsSync
 * se puede implementar si se vuelve a necesitar. Por ahora no hace nada.
 */
(function initFixCashMovementsSync() {
    if (typeof window === 'undefined') return;
    window.fixCashMovementsSync = window.fixCashMovementsSync || function() {
        console.debug('fixCashMovementsSync placeholder executed');
    };
})();
