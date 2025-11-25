class OrderService {
    constructor(webAppUrl) {
        this.webAppUrl = webAppUrl;
    }

    async fetchOrders() {
        try {
            const response = await fetch(this.webAppUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                const orders = data.orders || [];
                const formatted = orders.map(order => {
                    const formatted = {
                        ...order,
                        deliveryDate: this.formatDeliveryDate(order.deliveryDate),
                        deliveryTime: this.formatDeliveryTime(order.deliveryTime)
                    };
                    return formatted;
                });
                return formatted;
            } else {
                throw new Error(data.message || 'Unknown error');
            }
        } catch (error) {
            throw error;
        }
    }

    formatDeliveryDate(dateStr) {
        if (!dateStr) return 'N/A';
        if (/[a-zA-Z]/.test(dateStr)) {
            return dateStr;
        }
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('en-GB', options);
        } catch (e) {
            return dateStr;
        }
    }

    formatDeliveryTime(timeStr) {
        if (!timeStr) return 'N/A';
        if (/^\d{2}:\d{2}$/.test(timeStr)) {
            return timeStr;
        }
        try {
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        } catch (e) {
            return timeStr;
        }
    }

    getTodayOrders(orders) {
        const today = new Date().toDateString();
        return orders.filter(order => {
            const orderDate = new Date(order.timestamp).toDateString();
            return orderDate === today;
        });
    }

    calculateTotalRevenue(orders) {
        let total = 0;
        orders.forEach(order => {
            const matches = order.items.match(/₹(\d+)/g);
            if (matches) {
                matches.forEach(match => {
                    const amount = parseInt(match.replace('₹', ''));
                    total += amount;
                });
            }
        });
        return total;
    }

    searchOrders(orders, query) {
        if (!query || query.trim() === '') {
            return orders;
        }

        const lowerQuery = query.toLowerCase();
        return orders.filter(order => {
            const orderId = (order.orderId || '').toString().toLowerCase();
            const flat = (order.flat || '').toString().toLowerCase();
            const apartment = (order.apartment || '').toString().toLowerCase();
            const items = (order.items || '').toString().toLowerCase();
            const deliveryDate = (order.deliveryDate || '').toString().toLowerCase();
            const deliveryTime = (order.deliveryTime || '').toString().toLowerCase();
            return (
                orderId.includes(lowerQuery) ||
                flat.includes(lowerQuery) ||
                apartment.includes(lowerQuery) ||
                items.includes(lowerQuery) ||
                deliveryDate.includes(lowerQuery) ||
                deliveryTime.includes(lowerQuery)
            );
        });
    }

    sortByDeliveryTime(orders) {
        return [...orders].sort((a, b) => {
            const timeA = this.parseDeliveryTime(a.deliveryTime);
            const timeB = this.parseDeliveryTime(b.deliveryTime);
            return timeA - timeB;
        });
    }

    parseDeliveryTime(timeStr) {
        if (!timeStr) return 0;
        
        try {
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const isPM = match[3].toUpperCase() === 'PM';
            
            if (isPM && hours !== 12) {
                hours += 12;
            } else if (!isPM && hours === 12) {
                hours = 0;
            }
            
            return hours * 60 + minutes;
        } catch (e) {
            return 0;
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleString('en-IN', options);
    }
}

