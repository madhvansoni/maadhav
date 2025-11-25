class MenuModel {
    constructor() {
        this.menuItems = [];
        this.cart = {};
        this.config = null;
    }

    async loadMenuItems() {
        try {
            const response = await fetch('menu.json');
            if (!response.ok) {
                throw new Error('Failed to load menu items');
            }
            const data = await response.json();
            this.menuItems = data.menuItems;
            
            this.menuItems.forEach(item => {
                this.cart[item.id] = 0;
            });
            
            return this.menuItems;
        } catch (error) {
            throw error;
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }
            this.config = await response.json();
            return this.config;
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    getDeliveryDate() {
        return this.config?.deliveryDate || null;
    }

    getDeliveryTime() {
        return this.config?.deliveryTime || null;
    }

    generateTimeSlots() {
        if (!this.config || !this.config.deliveryTime) {
            return [];
        }

        const { startTime, endTime, intervalMinutes } = this.config.deliveryTime;
        const timeSlots = [];

        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        let currentTime = new Date();
        currentTime.setHours(startHour, startMinute, 0, 0);

        const endTimeObj = new Date();
        endTimeObj.setHours(endHour, endMinute, 0, 0);

        while (currentTime <= endTimeObj) {
            const hours = currentTime.getHours();
            const minutes = currentTime.getMinutes();
            
            const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            const displayHours = hours % 12 || 12;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const label = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

            timeSlots.push({ value, label });

            currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
        }

        return timeSlots;
    }

    getMenuItems() {
        return this.menuItems;
    }

    getVisibleMenuItems() {
        return this.menuItems.filter(item => item.display === 1);
    }

    getMenuItem(id) {
        return this.menuItems.find(item => item.id === id) || null;
    }

    updateCartQuantity(itemId, quantity) {
        if (this.cart.hasOwnProperty(itemId)) {
            this.cart[itemId] = Math.max(0, quantity);
        }
    }

    getCartQuantity(itemId) {
        return this.cart[itemId] || 0;
    }

    getCartItems() {
        const cartItems = [];
        for (let itemId in this.cart) {
            if (this.cart[itemId] > 0) {
                const item = this.getMenuItem(itemId);
                if (item) {
                    cartItems.push({
                        ...item,
                        quantity: this.cart[itemId]
                    });
                }
            }
        }
        return cartItems;
    }

    calculateTotal() {
        let total = 0;
        for (let itemId in this.cart) {
            const quantity = this.cart[itemId];
            if (quantity > 0) {
                const item = this.getMenuItem(itemId);
                if (item) {
                    total += quantity * item.price;
                }
            }
        }
        return total;
    }

    isCartEmpty() {
        return this.calculateTotal() === 0;
    }

    clearCart() {
        for (let itemId in this.cart) {
            this.cart[itemId] = 0;
        }
    }

    getUnitDisplay(unit, quantity = 1) {
        const unitMap = {
            'piece': quantity > 1 ? 'pcs' : 'pc',
            'kg': 'Kg',
            'plate': quantity > 1 ? 'plates' : 'plate',
            'dozen': 'dozen'
        };
        return unitMap[unit.toLowerCase()] || unit;
    }
}

