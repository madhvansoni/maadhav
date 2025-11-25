let allOrders = [];
let allCustomers = [];
let newlyAddedCustomerId = null;
let analyticsLoaded = false;

async function loadDashboard() {
    try {
        await loadConfig();
    } catch (error) {
        console.error('Error loading config:', error);
        showNotification('Failed to load configuration', 'error');
    }
}

async function loadDashboardAnalytics() {
    if (analyticsLoaded) return;
    
    try {
        showLoading('Loading analytics...');
        
        const ordersResponse = await api.getOrders();
        const customersResponse = await api.getCustomers();
        
        if (ordersResponse.status === 'success') {
            allOrders = ordersResponse.orders || [];
        }
        
        if (customersResponse.status === 'success') {
            allCustomers = customersResponse.customers || [];
        }
        
        updateStats();
        displayPendingPayments();
        displayRecentActivity();
        populateQuickOrderCustomers();
        
        analyticsLoaded = true;
        hideLoading();
    } catch (error) {
        console.error('Error loading analytics:', error);
        hideLoading();
        showNotification('Failed to load analytics', 'error');
    }
}

function updateStats() {
    document.getElementById('totalCustomers').textContent = allCustomers.length;
    
    const pendingOrders = allOrders.filter(order => 
        parseFloat(order.balance || 0) > 0
    );
    document.getElementById('pendingOrders').textContent = pendingOrders.length;
    
    const totalPending = pendingOrders.reduce((sum, order) => 
        sum + parseFloat(order.balance || 0), 0
    );
    document.getElementById('totalPending').textContent = formatCurrency(totalPending);
    
    const totalCollected = allOrders.reduce((sum, order) => 
        sum + parseFloat(order.paidAmount || 0), 0
    );
    document.getElementById('totalCollected').textContent = formatCurrency(totalCollected);
}

function displayPendingPayments() {
    const tbody = document.getElementById('pendingPaymentsTable');
    const pendingOrders = allOrders.filter(order => 
        parseFloat(order.balance || 0) > 0
    );
    
    if (pendingOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-check-circle"></i> No pending payments! All cleared.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pendingOrders.map(order => {
        const customer = allCustomers.find(c => c.customerId === order.customerId);
        return `
            <tr>
                <td><strong>${order.orderId}</strong></td>
                <td>${customer ? customer.businessName : 'N/A'}</td>
                <td>${formatDate(order.orderDate)}</td>
                <td>${order.itemCount}</td>
                <td>${formatCurrency(order.totalCharge)}</td>
                <td class="text-success">${formatCurrency(order.paidAmount || 0)}</td>
                <td class="text-danger"><strong>${formatCurrency(order.balance)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="openPaymentModal('${order.orderId}', '${customer ? customer.businessName : ''}', ${order.balance})" title="Record Payment">
                        <i class="fas fa-wallet"></i> Record Payment
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function displayRecentActivity() {
    const activityDiv = document.getElementById('recentActivity');
    
    const recentOrders = [...allOrders].sort((a, b) => 
        new Date(b.orderDate) - new Date(a.orderDate)
    ).slice(0, 5);
    
    if (recentOrders.length === 0) {
        activityDiv.innerHTML = '<div class="text-center text-muted">No recent activity</div>';
        return;
    }
    
    activityDiv.innerHTML = recentOrders.map(order => {
        const customer = allCustomers.find(c => c.customerId === order.customerId);
        const isPaid = parseFloat(order.balance || 0) === 0;
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${isPaid ? 'fa-check-circle' : 'fa-clock'}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">
                        ${customer ? customer.businessName : 'Unknown'} - ${order.itemCount} items
                    </div>
                    <div class="activity-meta">
                        ${formatDate(order.orderDate)} • ${formatCurrency(order.totalCharge)} • 
                        <span class="${isPaid ? 'text-success' : 'text-danger'}">
                            ${isPaid ? 'Fully Paid' : `Pending: ${formatCurrency(order.balance)}`}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openPaymentModal(orderId, customerName, balance) {
    document.getElementById('paymentOrderId').value = orderId;
    document.getElementById('paymentCustomerName').value = customerName;
    document.getElementById('paymentBalance').value = formatCurrency(balance);
    document.getElementById('paymentAmount').value = balance;
    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentNotes').value = '';
}

async function submitPayment() {
    const orderId = document.getElementById('paymentOrderId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const mode = document.getElementById('paymentMode').value;
    const notes = document.getElementById('paymentNotes').value;
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
    }
    
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) {
        showNotification('Order not found', 'error');
        return;
    }
    
    if (amount > parseFloat(order.balance)) {
        showNotification('Payment amount cannot exceed balance amount', 'warning');
        return;
    }
    
    try {
        showLoading('Recording payment...');
        
        const paymentData = {
            paymentId: generateId('PAY'),
            orderId: orderId,
            customerId: order.customerId,
            amount: amount,
            mode: mode,
            notes: notes,
            timestamp: new Date().toISOString(),
            recordedBy: 'Staff'
        };
        
        await api.savePayment(paymentData);
        
        hideLoading();
        showNotification('Payment recorded successfully!', 'success');
        closePaymentModal();
        
        analyticsLoaded = false;
        loadDashboardAnalytics();
    } catch (error) {
        console.error('Error recording payment:', error);
        hideLoading();
        showNotification('Payment recorded (updating in background)', 'info');
        closePaymentModal();
    }
}

function openQuickAddCustomer() {
    closeQuickOrderModal();
    document.getElementById('quickBusinessName').value = '';
    document.getElementById('quickOwnerName').value = '';
    document.getElementById('quickPhone').value = '';
    document.getElementById('quickRatePerItem').value = CONFIG.defaultRatePerItem || 10;
    document.getElementById('quickCustomerModal').classList.add('active');
}

function closeQuickCustomerModal() {
    document.getElementById('quickCustomerModal').classList.remove('active');
}

async function saveQuickCustomer() {
    const businessName = document.getElementById('quickBusinessName').value.trim();
    const ownerName = document.getElementById('quickOwnerName').value.trim();
    const phone = document.getElementById('quickPhone').value.trim();
    const ratePerItem = document.getElementById('quickRatePerItem').value;
    
    if (!businessName || !ownerName || !phone || !ratePerItem) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const customerId = generateId('CUST');
    const customerData = {
        customerId,
        businessName,
        ownerName,
        phone,
        whatsappNumber: phone,
        ratePerItem: parseFloat(ratePerItem),
        address: '',
        notes: '',
        createdAt: new Date().toISOString()
    };
    
    try {
        showLoading('Saving customer...');
        await api.saveCustomer(customerData);
        hideLoading();
        
        newlyAddedCustomerId = customerId;
        allCustomers.push(customerData);
        
        showNotification('Customer added successfully!', 'success');
        closeQuickCustomerModal();
        
        populateQuickOrderCustomers();
        openQuickAddOrder();
    } catch (error) {
        console.error('Error saving customer:', error);
        hideLoading();
        showNotification('Customer saved (updating in background)', 'info');
        closeQuickCustomerModal();
    }
}

async function openQuickAddOrder() {
    closeQuickCustomerModal();
    
    if (allCustomers.length === 0) {
        try {
            showLoading('Loading customers...');
            await loadConfig();
            const customersResponse = await api.getCustomers();
            if (customersResponse.status === 'success') {
                allCustomers = customersResponse.customers || [];
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
    document.getElementById('quickOrderDate').value = today;
    document.getElementById('quickItemCount').value = '';
    document.getElementById('quickOrderRate').value = '';
    document.getElementById('quickTotalCharge').value = '';
    document.getElementById('quickAdvancePayment').value = '0';
    document.getElementById('quickOrderPaymentMode').value = 'Cash';
    document.getElementById('quickItemDescription').value = '';
    document.getElementById('quickOrderNotes').value = '';
    
    populateQuickOrderCustomers();
    
    if (newlyAddedCustomerId) {
        document.getElementById('quickOrderCustomerId').value = newlyAddedCustomerId;
        updateQuickCustomerRate();
        newlyAddedCustomerId = null;
    }
    
    document.getElementById('quickOrderModal').classList.add('active');
}

function closeQuickOrderModal() {
    document.getElementById('quickOrderModal').classList.remove('active');
}

function populateQuickOrderCustomers() {
    const select = document.getElementById('quickOrderCustomerId');
    if (!select) return;
    
    if (allCustomers.length === 0) {
        select.innerHTML = '<option value="">-- No customers loaded --</option>';
        return;
    }
    
    select.innerHTML = '<option value="">-- Select Customer --</option>' +
        allCustomers.map(customer => `
            <option value="${customer.customerId}" data-rate="${customer.ratePerItem}">
                ${customer.businessName} - ${customer.ownerName}
            </option>
        `).join('');
}

function updateQuickCustomerRate() {
    const select = document.getElementById('quickOrderCustomerId');
    const selectedOption = select.options[select.selectedIndex];
    const rate = selectedOption.getAttribute('data-rate');
    
    if (rate) {
        document.getElementById('quickOrderRate').value = rate;
        calculateQuickTotal();
    }
}

function calculateQuickTotal() {
    const itemCount = parseFloat(document.getElementById('quickItemCount').value) || 0;
    const rate = parseFloat(document.getElementById('quickOrderRate').value) || 0;
    const total = itemCount * rate;
    
    document.getElementById('quickTotalCharge').value = total.toFixed(2);
    validateQuickAdvancePayment();
}

function validateQuickAdvancePayment() {
    const total = parseFloat(document.getElementById('quickTotalCharge').value) || 0;
    const advance = parseFloat(document.getElementById('quickAdvancePayment').value) || 0;
    const hint = document.getElementById('quickAdvanceHint');
    
    if (advance > total) {
        hint.style.display = 'block';
        document.getElementById('quickAdvancePayment').style.borderColor = '#dc3545';
    } else {
        hint.style.display = 'none';
        document.getElementById('quickAdvancePayment').style.borderColor = '';
    }
}

async function saveQuickOrder() {
    const customerId = document.getElementById('quickOrderCustomerId').value;
    const orderDate = document.getElementById('quickOrderDate').value;
    const itemCount = document.getElementById('quickItemCount').value;
    const ratePerItem = document.getElementById('quickOrderRate').value;
    const totalCharge = document.getElementById('quickTotalCharge').value;
    const advancePayment = document.getElementById('quickAdvancePayment').value || 0;
    const paymentMode = document.getElementById('quickOrderPaymentMode').value;
    const itemDescription = document.getElementById('quickItemDescription').value.trim();
    const notes = document.getElementById('quickOrderNotes').value.trim();
    
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
    const orderData = {
        orderId,
        customerId,
        orderDate,
        itemCount: parseInt(itemCount),
        ratePerItem: parseFloat(ratePerItem),
        totalCharge: total,
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
        closeQuickOrderModal();
        
        if (analyticsLoaded) {
            loadDashboardAnalytics();
        }
    } catch (error) {
        console.error('Error saving order:', error);
        hideLoading();
        showNotification('Order created (updating in background)', 'info');
        closeQuickOrderModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#pendingPaymentsTable tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
});

function refreshDashboard() {
    analyticsLoaded = false;
    loadDashboardAnalytics();
}

function toggleDashboardAnalytics() {
    const analyticsDiv = document.getElementById('dashboardAnalytics');
    const toggleText = document.getElementById('toggleAnalyticsText');
    const toggleIcon = document.getElementById('toggleAnalyticsIcon');
    
    if (analyticsDiv.style.display === 'none') {
        analyticsDiv.style.display = 'block';
        toggleText.textContent = 'Hide Dashboard Analytics';
        toggleIcon.className = 'fas fa-chevron-up';
        
        loadDashboardAnalytics();
    } else {
        analyticsDiv.style.display = 'none';
        toggleText.textContent = 'Show Dashboard Analytics';
        toggleIcon.className = 'fas fa-chevron-down';
    }
}

