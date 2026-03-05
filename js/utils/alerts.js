const showNotification = (message, type = 'info') => {
    const container = document.getElementById('notification-container');
    if (!container) return;

    // C2: Anti-spam — No mostrar la misma notificación si ya está en pantalla
    const existingNotifications = Array.from(container.querySelectorAll('.notification'));
    const isDuplicate = existingNotifications.some(n => n.innerText.includes(message));
    if (isDuplicate) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.animation = 'slideDown 0.4s ease-out forwards';

    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    notification.innerHTML = `
        <span style="font-size: 1.25rem;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    const duration = type === 'error' ? 5000 : 3000;

    setTimeout(() => {
        notification.style.animation = 'slideDown 0.35s ease-in reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);
};

const showModal = (content, options = {}) => {
    const overlay = document.getElementById('modal-overlay');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.width = options.width || '600px';

    modal.innerHTML = `
        <div class="modal-header">
            <h3>${options.title || 'Modal'}</h3>
            <button class="close-modal" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            ${content}
        </div>
        ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
    `;

    overlay.classList.add('active');
    document.body.appendChild(modal);

    return modal;
};

const closeModal = () => {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');

    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        // Remover listener de Enter si existe
        if (modal._enterKeyHandler) {
            document.removeEventListener('keydown', modal._enterKeyHandler, true);
        }
        modal.remove();
    });
};

const showConfirm = (message, callback) => {
    const content = `
        <p style="font-size: 1rem; margin-bottom: 1.5rem; text-align: center;">${message}</p>
    `;

    const footer = `
        <button class="btn btn-secondary" style="flex: 1" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-danger" style="flex: 1" onclick="confirmAction()">Confirmar</button>
    `;

    showModal(content, {
        title: 'Confirmación',
        footer: `<div style="display: flex; gap: 1rem; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">${footer}</div>`,
        width: '400px'
    });

    window.confirmAction = () => {
        if (typeof callback === 'function') {
            callback();
        }
        closeModal();
        delete window.confirmAction;
    };
};
