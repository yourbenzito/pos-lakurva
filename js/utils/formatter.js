const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const roundPrice = (price) => {
    const lastDigit = Math.floor(price) % 10;
    const base = Math.floor(price / 10) * 10;
    
    // $1-$5 round down, $6-$9 round up
    if (lastDigit >= 6) {
        return base + 10;
    } else {
        return base;
    }
};

const formatNumber = (number) => {
    return new Intl.NumberFormat('es-CL').format(number);
};

const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(date));
};

const formatDateTime = (date) => {
    return new Intl.DateTimeFormat('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
};

const formatTime = (date) => {
    return new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(date));
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    return parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
};
