
class GoogleSheetsService {
    constructor(config) {
        this.method = config.method || 'apiKey';
        this.apiKey = config.apiKey;
        this.sheetId = config.sheetId;
        this.sheetName = config.sheetName || 'Orders';
        
        const savedUrl = localStorage.getItem('littleTreat_webAppUrl');
        const defaultUrl = typeof ServiceConfig !== 'undefined' ? ServiceConfig.getScriptUrl() : null;
        this.webAppUrl = savedUrl || defaultUrl || config.webAppUrl;
        
        this.enabled = config.enabled !== false;
    }

    async saveOrder(orderData) {
        if (!this.enabled) {
            console.log('Google Sheets integration is disabled');
            return false;
        }

        try {
            const orderId = this.generateOrderId();
            const fullOrderData = {
                orderId: orderId,
                date: orderData.date,
                time: orderData.time,
                customerName: orderData.customerName || 'N/A',
                phone: orderData.phone || 'N/A',
                flatNumber: orderData.flatNumber,
                apartmentName: orderData.apartmentName,
                items: orderData.items,
                total: orderData.total,
                status: 'Pending',
                timestamp: new Date().toISOString()
            };

            let success;
           
            if (this.method === 'appsScript') {
                success = await this.saveViaAppsScript(fullOrderData);
            } else {
                success = await this.saveViaApiKey(fullOrderData);
            }
            
            if (success) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async saveViaAppsScript(orderData) {
        if (!this.webAppUrl) {
            return false;
        }

        try {
            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            return true;
        } catch (error) {
            return false;
        }
    }

    async saveViaApiKey(orderData) {
        try {
            const row = [
                orderData.orderId,
                orderData.date,
                orderData.time,
                orderData.customerName,
                orderData.phone,
                orderData.flatNumber,
                orderData.apartmentName,
                orderData.items,
                orderData.total,
                orderData.status,
                orderData.timestamp
            ];

            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.sheetName}!A:K:append?valueInputOption=RAW&key=${this.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: [row]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return false;
            }
            const result = await response.json();
            return true;
        } catch (error) {
            return false;
        }
    }

    generateOrderId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const orderId = `#LT${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
        return orderId;
    }

    static formatOrderItems(cartItems) {
        return cartItems.map(item => {
            const unit = item.unit === 'kg' ? 'Kg' : item.unit === 'piece' ? 'pcs' : item.unit;
            return `${item.name} x ${item.quantity} ${unit} (₹${item.price * item.quantity})`;
        }).join(', ');
    }
}

