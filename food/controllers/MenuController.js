
class MenuController {
    constructor(model, view, sheetsService = null) {
        this.model = model;
        this.view = view;
        this.sheetsService = sheetsService;
        this.currentStep = 1;
    }

    async init() {
        try {
            await Promise.all([
                this.model.loadMenuItems(),
                this.model.loadConfig()
            ]);
            
            const visibleItems = this.model.getVisibleMenuItems();
            this.view.renderMenuItems(visibleItems, this.handleQuantityChange.bind(this));
            
            const deliveryDate = this.model.getDeliveryDate();
            const timeSlots = this.model.generateTimeSlots();
            this.view.renderDeliveryDateTime(deliveryDate, timeSlots);
            
            this.setupEventListeners();
                        
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.view.showError('Failed to load menu. Please refresh the page.');
        }
    }

    setupEventListeners() {
        
        const proceedBtn = document.getElementById('proceedBtn');
        if (proceedBtn) {
            proceedBtn.onclick = () => this.proceedToAddress();
        }

        const bookBtn = document.querySelector('[onclick*="bookOrder"]');
        if (bookBtn) {
            bookBtn.onclick = () => this.bookOrder();
        }

        const backBtn = document.querySelector('[onclick*="goToStep(1)"]');
        if (backBtn) {
            backBtn.onclick = () => this.goToStep(1);
        }

        const flatNumber = document.getElementById('flatNumber');
        const apartmentName = document.getElementById('apartmentName');
        const dateSelect = document.getElementById('dateSelect');

        if (flatNumber) {
            flatNumber.oninput = () => this.updateLiveReview();
        }
        if (apartmentName) {
            apartmentName.oninput = () => this.updateLiveReview();
        }
        if (dateSelect) {
            dateSelect.onchange = () => this.updateLiveReview();
        }
    }

    handleQuantityChange(itemId, change) {
        const currentQuantity = this.model.getCartQuantity(itemId);
        const newQuantity = currentQuantity + change;
        
        if (newQuantity >= 0) {
            this.model.updateCartQuantity(itemId, newQuantity);
            this.view.updateQuantityDisplay(itemId, newQuantity);
        }
    }

    proceedToAddress() {
        if (this.model.isCartEmpty()) {
            this.view.showError('Please select at least one item to proceed!');
            return;
        }
        
        const cartItems = this.model.getCartItems();
        const total = this.model.calculateTotal();
        this.view.renderOrderSummary(cartItems, total);
        
        this.goToStep(2);
    }

    goToStep(step) {
        this.currentStep = step;
        this.view.goToStep(step);
    }

    updateLiveReview() {
        
        const formValues = this.view.getFormValues();
        
        if (formValues.flatNumber && formValues.apartmentName) {
            this.view.showFieldError('addressError', false);
        }
        
        if (formValues.dateSelect) {
            this.view.showFieldError('dateError', false);
        }
    }

    validateAddressForm() {
        return this.view.validateForm();
    }

    async bookOrder() {
    
        if (!this.validateAddressForm()) {
            return;
        }
        
        const formValues = this.view.getFormValues();
        const cartItems = this.model.getCartItems();
        const total = this.model.calculateTotal();
        
        let orderItems = '';
        cartItems.forEach(item => {
            const unitDisplay = this.model.getUnitDisplay(item.unit, item.quantity);
            orderItems += `${item.emoji || '📦'} ${item.name}: ${item.quantity} ${unitDisplay}\n`;
        });
        
        const message = `🍽️ *Little Treat Order*

📦 *Order Items:*
${orderItems}
📅 *Delivery Date & Time:* ${formValues.dateSelectText}
💰 *Total Amount:* ₹${total}

📍 *Delivery Address:*
Flat: ${formValues.flatNumber}
Apartment: ${formValues.apartmentName}

Please confirm my order. Thank you! 😊`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/917710963036?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        if (this.sheetsService && this.sheetsService.enabled) {
            this.saveToSheetsInBackground(formValues, cartItems, total);
        }
    }

    saveToSheetsInBackground(formValues, cartItems, total) {
        setTimeout(async () => {
            try {
                const orderData = {
                    date: this.model.getDeliveryDate()?.date || 'N/A',
                    time: formValues.dateSelectText,
                    customerName: '',
                    phone: '',
                    flatNumber: formValues.flatNumber,
                    apartmentName: formValues.apartmentName,
                    items: GoogleSheetsService.formatOrderItems(cartItems),
                    total: `₹${total}`
                };
                
                const saved = await this.sheetsService.saveOrder(orderData);
                
                if (saved) {
                } else {
                    console.warn('⚠️ Failed to save to Google Sheets');
                }
            } catch (error) {
                console.error('Error saving to Google Sheets:', error);
            }
        }, 0);
    }
}

