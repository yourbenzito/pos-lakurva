const formatCLP = (amount, skipRounding = false) => {
    const value = parseFloat(amount);
    if (isNaN(value)) return '$0';
    const rounded = skipRounding ? Math.round(value) : roundPrice(value);
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(rounded);
};

const roundPrice = (price) => {
    const value = parseFloat(price);
    if (Number.isNaN(value)) return 0;
    // Redondeo a la decena más cercana (incluye valores con decimales)
    return Math.round(value / 10) * 10;
};

const formatNumber = (number) => {
    return new Intl.NumberFormat('es-CL').format(number);
};

const formatStock = (value, maxDecimals = 3) => {
    let decimals = parseInt(maxDecimals, 10);
    if (isNaN(decimals) || decimals < 0) decimals = 3;
    if (decimals > 20) decimals = 20;

    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) return '0';

    // Si es entero, no mostramos decimales, de lo contrario mostramos hasta el mínimo entre decimals y 3 por defecto
    const fractionDigits = parsed % 1 === 0 ? 0 : Math.min(decimals, 3);

    try {
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: decimals
        }).format(parsed);
    } catch (e) {
        console.error('formatStock error:', e, { value, decimals, fractionDigits });
        return parsed.toString();
    }
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

const formatMonthYear = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    // Si es YYYY-MM-DD o YYYY-MM
    if (parts.length >= 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        // Usar constructor con argumentos numéricos (año, mesIndex, día) para forzar fecha LOCAL
        const date = new Date(year, month - 1, 1);
        return new Intl.DateTimeFormat('es-CL', {
            month: 'long',
            year: 'numeric'
        }).format(date);
    }
    return dateStr;
};
