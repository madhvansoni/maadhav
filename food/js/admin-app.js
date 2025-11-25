
document.addEventListener('DOMContentLoaded', async function() {
    try {
        let webAppUrl = localStorage.getItem('littleTreat_webAppUrl');
        
        if (!webAppUrl && typeof ServiceConfig !== 'undefined') {
            webAppUrl = ServiceConfig.getScriptUrl();
        }
        
        if (!webAppUrl) {
            alert('Admin access requires configuration. Redirecting to setup page...');
            window.location.href = '/setup.html';
            return;
        }
        
        const orderService = new OrderService(webAppUrl);
        const adminModel = new AdminModel(orderService);
        
        try {
            await adminModel.loadConfig();
        } catch (error) {
            console.warn('Could not load config.json, using defaults');
        }
        
        const adminView = new AdminView();
        const adminController = new AdminController(adminModel, adminView);
        await adminController.init();
        
    } catch (error) {
        console.error('error:', error);
    }
});

