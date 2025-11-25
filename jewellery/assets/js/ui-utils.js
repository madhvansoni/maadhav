
function showLoading(message = 'Processing...') {
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <div class="loading-text" id="loadingText">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    document.getElementById('loadingText').textContent = message;
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function showNotification(message, type = 'info', title = '') {
    const existingToast = document.querySelector('.notification-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    if (!title) {
        switch(type) {
            case 'success': title = 'Success'; break;
            case 'error': title = 'Error'; break;
            case 'warning': title = 'Warning'; break;
            case 'info': title = 'Info'; break;
        }
    }
    
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.innerHTML = `
        <div class="notification-icon">${icons[type]}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal active';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> ${title}</h3>
                </div>
                <div class="modal-body">
                    <p style="font-size: 1.05rem; line-height: 1.6; white-space: pre-line;">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelButton">
                        Cancel
                    </button>
                    <button class="btn btn-primary" id="confirmButton">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('confirmButton').onclick = () => {
            overlay.remove();
            resolve(true);
        };
        
        document.getElementById('cancelButton').onclick = () => {
            overlay.remove();
            resolve(false);
        };
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

async function withLoading(asyncFunction, loadingMessage = 'Processing...') {
    showLoading(loadingMessage);
    try {
        const result = await asyncFunction();
        hideLoading();
        return result;
    } catch (error) {
        hideLoading();
        throw error;
    }
}


