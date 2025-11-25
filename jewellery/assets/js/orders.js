let allOrders = [];
let allCustomers = [];
let filteredOrders = [];
let ordersLoaded = false;

async function loadOrdersData() {
    try {
        showLoading('Loading orders...');
        await loadConfig();
        
        const ordersResponse = await api.getOrders();
        const customersResponse = await api.getCustomers();
        
        if (ordersResponse.status === 'success') {
            allOrders = ordersResponse.orders || [];
            filteredOrders = [...allOrders];
        }
        
        if (customersResponse.status === 'success') {
            allCustomers = customersResponse.customers || [];
            populateCustomerDropdown();
        }
        
        displayOrders();
        document.getElementById('ordersDataSection').style.display = 'block';
        ordersLoaded = true;
        hideLoading();
    } catch (error) {
        console.error('Error loading orders:', error);
        hideLoading();
        showNotification('Failed to load orders', 'error');
    }
}

async function loadOrders() {
    await loadConfig();
}

function displayOrders() {
    const tbody = document.getElementById('ordersTable');
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted">
                    No orders found.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredOrders.map(order => {
        const customer = allCustomers.find(c => c.customerId === order.customerId);
        const balance = parseFloat(order.balance || 0);
        const status = balance === 0 ? 'Paid' : 
                      balance < parseFloat(order.totalCharge) ? 'Partial' : 'Pending';
        
        return `
            <tr>
                <td><strong>${order.orderId}</strong></td>
                <td>${formatDate(order.orderDate)}</td>
                <td>${customer ? customer.businessName : 'N/A'}</td>
                <td>${order.itemCount}</td>
                <td>${formatCurrency(order.ratePerItem)}</td>
                <td>${formatCurrency(order.totalCharge)}</td>
                <td class="text-success">${formatCurrency(order.paidAmount || 0)}</td>
                <td class="${balance > 0 ? 'text-danger' : 'text-success'}">
                    <strong>${formatCurrency(balance)}</strong>
                </td>
                <td>
                    <span class="status-badge status-${status.toLowerCase()}">${status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${balance > 0 ? `
                            <button class="action-btn" onclick="sendOrderReminder('${order.orderId}')" title="Send Reminder">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn" onclick="viewOrderDetails('${order.orderId}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateCustomerDropdown() {
    const select = document.getElementById('orderCustomerId');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select Customer --</option>' +
        allCustomers.map(customer => `
            <option value="${customer.customerId}" data-rate="${customer.ratePerItem}">
                ${customer.businessName} - ${customer.ownerName}
            </option>
        `).join('');
}

async function openAddOrderModal() {
    if (allCustomers.length === 0) {
        try {
            showLoading('Loading customers...');
            await loadConfig();
            const customersResponse = await api.getCustomers();
            if (customersResponse.status === 'success') {
                allCustomers = customersResponse.customers || [];
                populateCustomerDropdown();
            }
            hideLoading();
        } catch (error) {
            console.error('Error loading customers:', error);
            hideLoading();
            showNotification('Failed to load customers', 'error');
            return;
        }
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('orderDate').value = today;
    document.getElementById('orderCustomerId').value = '';
    document.getElementById('itemCount').value = '';
    document.getElementById('orderRate').value = '';
    document.getElementById('totalCharge').value = '';
    document.getElementById('advancePayment').value = '0';
    document.getElementById('itemDescription').value = '';
    document.getElementById('orderNotes').value = '';
    document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

function updateCustomerRate() {
    const select = document.getElementById('orderCustomerId');
    const selectedOption = select.options[select.selectedIndex];
    const rate = selectedOption.getAttribute('data-rate');
    
    if (rate) {
        document.getElementById('orderRate').value = rate;
        calculateTotal();
    }
}

function calculateTotal() {
    const itemCount = parseFloat(document.getElementById('itemCount').value) || 0;
    const rate = parseFloat(document.getElementById('orderRate').value) || 0;
    const total = itemCount * rate;
    
    document.getElementById('totalCharge').value = total.toFixed(2);
    
    validateAdvancePayment();
}

function validateAdvancePayment() {
    const advancePayment = parseFloat(document.getElementById('advancePayment').value) || 0;
    const totalCharge = parseFloat(document.getElementById('totalCharge').value) || 0;
    const advanceHint = document.getElementById('advanceHint');
    const advanceInput = document.getElementById('advancePayment');
    
    if (advancePayment > totalCharge && totalCharge > 0) {
        advanceHint.style.display = 'block';
        advanceInput.style.borderColor = '#dc3545';
    } else {
        advanceHint.style.display = 'none';
        advanceInput.style.borderColor = '';
    }
}

async function saveOrder() {
    const customerId = document.getElementById('orderCustomerId').value;
    const orderDate = document.getElementById('orderDate').value;
    const itemCount = document.getElementById('itemCount').value;
    const ratePerItem = document.getElementById('orderRate').value;
    const totalCharge = document.getElementById('totalCharge').value;
    const advancePayment = document.getElementById('advancePayment').value || 0;
    const paymentMode = document.getElementById('orderPaymentMode').value;
    const itemDescription = document.getElementById('itemDescription').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();
    
    if (!customerId || !orderDate || !itemCount || !ratePerItem) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const paidAmount = parseFloat(advancePayment);
    const total = parseFloat(totalCharge);
    
    if (paidAmount > total) {
        showNotification(`Advance payment (₹${paidAmount}) cannot exceed total charge (₹${total})`, 'warning');
        return;
    }
    
    const orderId = generateId('ORD');
    const balance = total - paidAmount;
    
    const orderData = {
        orderId,
        customerId,
        orderDate,
        itemCount: parseInt(itemCount),
        ratePerItem: parseFloat(ratePerItem),
        totalCharge: parseFloat(totalCharge),
        paidAmount: 0,
        balance: total,
        itemDescription,
        notes,
        createdAt: new Date().toISOString()
    };
    
    try {
        showLoading('Creating order...');
        await api.saveOrder(orderData);
        
        if (paidAmount > 0) {
            const paymentData = {
                paymentId: generateId('PAY'),
                orderId,
                customerId,
                amount: paidAmount,
                mode: paymentMode,
                notes: 'Advance payment',
                timestamp: new Date().toISOString(),
                recordedBy: 'Staff'
            };
            await api.savePayment(paymentData);
        }
        
        hideLoading();
        showNotification('Order created successfully!', 'success');
        closeOrderModal();
        if (ordersLoaded) {
            loadOrdersData();
        }
    } catch (error) {
        console.error('Error saving order:', error);
        hideLoading();
        showNotification('Order created (updating in background)', 'info');
        closeOrderModal();
        if (ordersLoaded) {
            setTimeout(() => loadOrdersData(), 2000);
        }
    }
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) return;
    
    const customer = allCustomers.find(c => c.customerId === order.customerId);
    const balance = parseFloat(order.balance || 0);
    const status = balance === 0 ? 'Paid' : 
                  balance < parseFloat(order.totalCharge) ? 'Partial' : 'Pending';
    
    const content = `
        <div class="order-details">
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                <h4 style="margin: 0 0 1rem 0; color: var(--dark);">Order ID: ${order.orderId}</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div>
                        <strong>Customer:</strong> ${customer ? customer.businessName : 'N/A'}
                    </div>
                    <div>
                        <strong>Date:</strong> ${formatDate(order.orderDate)}
                    </div>
                    <div>
                        <strong>Number of Items:</strong> ${order.itemCount}
                    </div>
                    <div>
                        <strong>Rate/Item:</strong> ${formatCurrency(order.ratePerItem)}
                    </div>
                    <div>
                        <strong>Total Charge:</strong> <span style="color: var(--primary); font-weight: 600;">${formatCurrency(order.totalCharge)}</span>
                    </div>
                    <div>
                        <strong>Paid Amount:</strong> <span style="color: var(--success); font-weight: 600;">${formatCurrency(order.paidAmount || 0)}</span>
                    </div>
                    <div>
                        <strong>Balance:</strong> <span style="color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">${formatCurrency(balance)}</span>
                    </div>
                    <div>
                        <strong>Status:</strong> <span class="status-badge status-${status.toLowerCase()}">${status}</span>
                    </div>
                </div>
            </div>
            
            ${order.itemDescription ? `
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--dark);">Item Description:</strong>
                    <div style="background: white; padding: 1rem; border-radius: 8px; margin-top: 0.5rem; border-left: 3px solid var(--primary);">
                        ${order.itemDescription}
                    </div>
                </div>
            ` : ''}
            
            ${order.notes ? `
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--dark);">Notes:</strong>
                    <div style="background: white; padding: 1rem; border-radius: 8px; margin-top: 0.5rem; border-left: 3px solid var(--warning);">
                        ${order.notes}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('viewOrderModalContent').innerHTML = content;
    document.getElementById('viewOrderModal').classList.add('active');
}

function closeViewOrderModal() {
    document.getElementById('viewOrderModal').classList.remove('active');
}

function sendOrderReminder(orderId) {
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) return;
    
    const customer = allCustomers.find(c => c.customerId === order.customerId);
    if (!customer) return;
    
    const phone = customer.whatsappNumber || customer.phone;
    const message = `Dear ${customer.ownerName},

Your hallmarking charges for Order #${order.orderId}:
• Date: ${formatDate(order.orderDate)}
• Items: ${order.itemCount}
• Total Amount: ${formatCurrency(order.totalCharge)}
• Paid: ${formatCurrency(order.paidAmount || 0)}
• Balance: ${formatCurrency(order.balance)}

Please clear the pending dues at your earliest convenience.

Thank you!
${CONFIG.businessName || "P's Hallmarking Services"}`;
    
    sendWhatsAppReminder(phone, message);
    showNotification('WhatsApp opened with reminder message', 'success');
}

function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const searchTerm = document.getElementById('searchOrder').value.toLowerCase();
    
    filteredOrders = allOrders.filter(order => {
        let statusMatch = true;
        if (statusFilter !== 'all') {
            const balance = parseFloat(order.balance || 0);
            const status = balance === 0 ? 'Paid' : 
                          balance < parseFloat(order.totalCharge) ? 'Partial' : 'Pending';
            statusMatch = status === statusFilter;
        }
        
        let dateMatch = true;
        if (dateFrom || dateTo) {
            const orderDate = new Date(order.orderDate);
            if (dateFrom && orderDate < new Date(dateFrom)) dateMatch = false;
            if (dateTo && orderDate > new Date(dateTo)) dateMatch = false;
        }
        
        let searchMatch = true;
        if (searchTerm) {
            const customer = allCustomers.find(c => c.customerId === order.customerId);
            const searchText = `${order.orderId} ${customer ? customer.businessName : ''} ${customer ? customer.ownerName : ''}`.toLowerCase();
            searchMatch = searchText.includes(searchTerm);
        }
        
        return statusMatch && dateMatch && searchMatch;
    });
    
    displayOrders();
}

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    
    const searchInput = document.getElementById('searchOrder');
    if (searchInput) {
        searchInput.addEventListener('input', filterOrders);
    }
});

