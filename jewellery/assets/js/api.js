const api = {
    async getCustomers() {
        try {
            const response = await fetch(`${CONFIG.webAppUrl}?action=getCustomers`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }
    },

    async saveCustomer(customerData) {
        try {
            const response = await fetch(CONFIG.webAppUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveCustomer',
                    data: customerData
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving customer:', error);
            throw error;
        }
    },

    async updateCustomer(customerId, customerData) {
        try {
            const response = await fetch(CONFIG.webAppUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'updateCustomer',
                    customerId: customerId,
                    data: customerData
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    },

    async getOrders() {
        try {
            const response = await fetch(`${CONFIG.webAppUrl}?action=getOrders`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    },

    async saveOrder(orderData) {
        try {
            const response = await fetch(CONFIG.webAppUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveOrder',
                    data: orderData
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
    },

    async getPayments() {
        try {
            const response = await fetch(`${CONFIG.webAppUrl}?action=getPayments`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching payments:', error);
            throw error;
        }
    },

    async savePayment(paymentData) {
        try {
            const response = await fetch(CONFIG.webAppUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'savePayment',
                    data: paymentData
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving payment:', error);
            throw error;
        }
    },

    async getDashboardData() {
        try {
            const [customers, orders] = await Promise.all([
                this.getCustomers(),
                this.getOrders()
            ]);
            
            return {
                customers: customers.customers || [],
                orders: orders.orders || []
            };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }
};

function generateId(prefix = 'ID') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}${random}`;
}

function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return `₹${num.toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function getMonthName(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
}

function sendWhatsAppReminder(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

