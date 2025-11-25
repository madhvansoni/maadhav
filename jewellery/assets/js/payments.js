let allPayments = [];
let allOrders = [];
let allCustomers = [];
let filteredPayments = [];
let paymentsLoaded = false;

async function loadPaymentsData() {
    try {
        showLoading('Loading payments...');
        await loadConfig();
        
        const paymentsResponse = await api.getPayments();
        const ordersResponse = await api.getOrders();
        const customersResponse = await api.getCustomers();
        
        if (paymentsResponse.status === 'success') {
            allPayments = paymentsResponse.payments || [];
            filteredPayments = [...allPayments];
        }
        
        if (ordersResponse.status === 'success') {
            allOrders = ordersResponse.orders || [];
        }
        
        if (customersResponse.status === 'success') {
            allCustomers = customersResponse.customers || [];
        }
        
        updatePaymentStats();
        displayPayments();
        document.getElementById('paymentsDataSection').style.display = 'block';
        paymentsLoaded = true;
        hideLoading();
    } catch (error) {
        console.error('Error loading payments:', error);
        hideLoading();
        showNotification('Failed to load payments', 'error');
    }
}

async function loadPayments() {
    await loadConfig();
}

function updatePaymentStats() {
    const totalCollected = allPayments.reduce((sum, payment) => 
        sum + parseFloat(payment.amount || 0), 0
    );
    
    const cashAmount = allPayments
        .filter(p => p.mode === 'Cash')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    const upiAmount = allPayments
        .filter(p => p.mode === 'UPI')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    const cardAmount = allPayments
        .filter(p => p.mode === 'Card')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    const bankAmount = allPayments
        .filter(p => p.mode === 'Bank Transfer')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    document.getElementById('totalCollectedAmount').textContent = formatCurrency(totalCollected);
    document.getElementById('cashAmount').textContent = formatCurrency(cashAmount);
    document.getElementById('upiAmount').textContent = formatCurrency(upiAmount);
    document.getElementById('cardAmount').textContent = formatCurrency(cardAmount);
    document.getElementById('bankAmount').textContent = formatCurrency(bankAmount);
}

function displayPayments() {
    const tbody = document.getElementById('paymentsTable');
    
    if (filteredPayments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    No payments found.
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedPayments = [...filteredPayments].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    tbody.innerHTML = sortedPayments.map(payment => {
        const order = allOrders.find(o => o.orderId === payment.orderId);
        const customer = allCustomers.find(c => c.customerId === payment.customerId);
        
        return `
            <tr>
                <td><strong>${payment.paymentId}</strong></td>
                <td>${formatDateTime(payment.timestamp)}</td>
                <td>${payment.orderId}</td>
                <td>${customer ? customer.businessName : 'N/A'}</td>
                <td class="text-success"><strong>${formatCurrency(payment.amount)}</strong></td>
                <td>
                    <span class="status-badge status-${payment.mode.toLowerCase().replace(' ', '-')}">
                        ${payment.mode}
                    </span>
                </td>
                <td>${payment.notes || '-'}</td>
                <td>${payment.recordedBy || 'Staff'}</td>
            </tr>
        `;
    }).join('');
}

function filterPayments() {
    const modeFilter = document.getElementById('paymentModeFilter').value;
    const dateFrom = document.getElementById('paymentDateFrom').value;
    const dateTo = document.getElementById('paymentDateTo').value;
    const searchTerm = document.getElementById('searchPayment').value.toLowerCase();
    
    filteredPayments = allPayments.filter(payment => {
        let modeMatch = true;
        if (modeFilter !== 'all') {
            modeMatch = payment.mode === modeFilter;
        }
        
        let dateMatch = true;
        if (dateFrom || dateTo) {
            const paymentDate = new Date(payment.timestamp);
            if (dateFrom && paymentDate < new Date(dateFrom)) dateMatch = false;
            if (dateTo && paymentDate > new Date(dateTo)) dateMatch = false;
        }
        
        let searchMatch = true;
        if (searchTerm) {
            const customer = allCustomers.find(c => c.customerId === payment.customerId);
            const searchText = `${payment.paymentId} ${payment.orderId} ${customer ? customer.businessName : ''}`.toLowerCase();
            searchMatch = searchText.includes(searchTerm);
        }
        
        return modeMatch && dateMatch && searchMatch;
    });
    
    updatePaymentStats();
    displayPayments();
}

document.addEventListener('DOMContentLoaded', () => {
    loadPayments();
    
    const searchInput = document.getElementById('searchPayment');
    if (searchInput) {
        searchInput.addEventListener('input', filterPayments);
    }
});

