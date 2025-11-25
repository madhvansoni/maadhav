
class AdminModel {
    constructor(orderService) {
        this.orderService = orderService;
        this.allOrders = [];
        this.config = null;
    }

    async loadConfig() {
        try {
            const configPath = window.location.pathname.includes('/state/') ? '../config.json' : 'config.json';
            const response = await fetch(configPath);
            this.config = await response.json();
            return this.config;
        } catch (error) {
            throw error;
        }
    }

    async fetchOrders() {
        try {
            this.allOrders = await this.orderService.fetchOrders();
            return this.allOrders;
        } catch (error) {
            throw error;
        }
    }

    getAllOrders() {
        return this.allOrders;
    }

    getOrdersByStatus(status) {
        if (status === 'all') {
            return this.allOrders;
        }
        return this.allOrders.filter(order => order.status === status);
    }

    searchOrders(query) {
        return this.orderService.searchOrders(this.allOrders, query);
    }

    sortOrders(orders, sortBy) {
        const sorted = [...orders];
        
        if (sortBy === 'deliveryTime') {
            return this.orderService.sortByDeliveryTime(sorted);
        }
        
        return sorted.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
    }

    calculateSummary() {
        const today = new Date().toDateString();
        
        const todayOrders = this.allOrders.filter(order => {
            const orderDate = new Date(order.timestamp).toDateString();
            return orderDate === today;
        });

        let todayRevenue = 0;
        todayOrders.forEach(order => {
            const total = order.total;
            if (total) {
                const amount = parseInt(total.replace(/[^\d]/g, '')) || 0;
                todayRevenue += amount;
            }
        });

        return {
            totalOrders: this.allOrders.length,
            todayOrders: todayOrders.length,
            todayRevenue: todayRevenue
        };
    }

    updateOrderStatus(orderId, newStatus) {
        const order = this.allOrders.find(o => o.orderId === orderId);
        if (order) {
            order.status = newStatus;
        }
    }
    
    getWebAppUrl() {
        const savedUrl = localStorage.getItem('littleTreat_webAppUrl');
        return savedUrl || this.config?.googleSheets?.webAppUrl || '';
    }
}

