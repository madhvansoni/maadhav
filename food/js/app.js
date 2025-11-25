document.addEventListener('DOMContentLoaded', async function() {
    try {
        const model = new MenuModel();
        const view = new MenuView();
        await model.loadConfig();
        let sheetsService = null;
        const sheetsConfig = model.config?.googleSheets;
        
        if (sheetsConfig && sheetsConfig.enabled) {
            sheetsService = new GoogleSheetsService(sheetsConfig);
        }
        const controller = new MenuController(model, view, sheetsService);
        await controller.init();
        window.menuController = controller;
    } catch (error) {
        console.error('Failed to start application:', error);
        alert('Failed to load the application. Please refresh the page.');
    }
});

function updateQuantity(productId, change) {
    if (window.menuController) {
        window.menuController.handleQuantityChange(productId, change);
    }
}

function proceedToAddress() {
    if (window.menuController) {
        window.menuController.proceedToAddress();
    }
}

async function bookOrder() {
    if (window.menuController) {
        await window.menuController.bookOrder();
    }
}

function goToStep(step) {
    if (window.menuController) {
        window.menuController.goToStep(step);
    }
}

function updateLiveReview() {
    if (window.menuController) {
        window.menuController.updateLiveReview();
    }
}

