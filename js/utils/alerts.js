const showNotification = (message, type = 'info') => {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <span style="font-size: 1.25rem;">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
    modals.forEach(modal => modal.remove());
};

const confirm = (message, callback) => {
    const content = `
        <p style="font-size: 1rem; margin-bottom: 1.5rem;">${message}</p>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="confirmAction()">Confirmar</button>
    `;
    
    showModal(content, {
        title: 'Confirmación',
        footer: footer,
        width: '400px'
    });
    
    window.confirmAction = () => {
        callback();
        closeModal();
        delete window.confirmAction;
    };
};
