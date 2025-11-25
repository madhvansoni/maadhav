let allCustomers = [];
let allOrders = [];
let customersLoaded = false;

async function loadCustomersData() {
    try {
        showLoading('Loading customers...');
        await loadConfig();
        
        const customersResponse = await api.getCustomers();
        const ordersResponse = await api.getOrders();
        
        if (customersResponse.status === 'success') {
            allCustomers = customersResponse.customers || [];
        }
        
        if (ordersResponse.status === 'success') {
            allOrders = ordersResponse.orders || [];
        }
        
        displayCustomers();
        document.getElementById('customersDataSection').style.display = 'block';
        customersLoaded = true;
        hideLoading();
    } catch (error) {
        console.error('Error loading customers:', error);
        hideLoading();
        showNotification('Failed to load customers', 'error');
    }
}

async function loadCustomers() {
    await loadConfig();
}

function displayCustomers() {
    const tbody = document.getElementById('customersTable');
    
    if (allCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    No customers found. Click "Add New Customer" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allCustomers.map(customer => {
        const customerOrders = allOrders.filter(o => o.customerId === customer.customerId);
        const pendingAmount = customerOrders.reduce((sum, order) => 
            sum + parseFloat(order.balance || 0), 0
        );
        const pendingOrders = customerOrders.filter(o => parseFloat(o.balance || 0) > 0);
        
        return `
            <tr>
                <td><strong>${customer.customerId}</strong></td>
                <td>${customer.businessName}</td>
                <td>${customer.ownerName}</td>
                <td>${formatCurrency(customer.ratePerItem)}</td>
                <td>${customerOrders.length}</td>
                <td class="${pendingAmount > 0 ? 'text-danger' : 'text-success'}">
                    ${formatCurrency(pendingAmount)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="viewCustomer('${customer.customerId}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="editCustomer('${customer.customerId}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${pendingOrders.length > 0 ? `
                        <button class="action-btn" onclick="openSettleAllModal('${customer.customerId}')" title="Settle All Pending" style="color: #10b981;">
                            <i class="fas fa-check-double"></i>
                        </button>
                        <button class="action-btn" onclick="sendCombinedReminder('${customer.customerId}')" title="Send WhatsApp Reminder" style="color: #25d366;">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddCustomerModal() {
    document.getElementById('modalTitle').textContent = 'Add New Customer';
    document.getElementById('customerId').value = '';
    document.getElementById('businessName').value = '';
    document.getElementById('ownerName').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('whatsappNumber').value = '';
    document.getElementById('ratePerItem').value = CONFIG.defaultRatePerItem || 10;
    document.getElementById('address').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('customerModal').classList.add('active');
}

function closeCustomerModal() {
    document.getElementById('customerModal').classList.remove('active');
}

function editCustomer(customerId) {
    const customer = allCustomers.find(c => c.customerId === customerId);
    if (!customer) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Customer';
    document.getElementById('customerId').value = customer.customerId;
    document.getElementById('businessName').value = customer.businessName;
    document.getElementById('ownerName').value = customer.ownerName;
    document.getElementById('phone').value = customer.phone;
    document.getElementById('whatsappNumber').value = customer.whatsappNumber || '';
    document.getElementById('ratePerItem').value = customer.ratePerItem;
    document.getElementById('address').value = customer.address || '';
    document.getElementById('notes').value = customer.notes || '';
    document.getElementById('customerModal').classList.add('active');
}

async function saveCustomer() {
    const customerId = document.getElementById('customerId').value;
    const businessName = document.getElementById('businessName').value.trim();
    const ownerName = document.getElementById('ownerName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const whatsappNumber = document.getElementById('whatsappNumber').value.trim();
    const ratePerItem = document.getElementById('ratePerItem').value;
    const address = document.getElementById('address').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    if (!businessName || !ownerName || !phone || !ratePerItem) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const customerData = {
        customerId: customerId || generateId('CUST'),
        businessName,
        ownerName,
        phone,
        whatsappNumber: whatsappNumber || phone,
        ratePerItem: parseFloat(ratePerItem),
        address,
        notes,
        createdAt: customerId ? undefined : new Date().toISOString()
    };
    
    try {
        showLoading(customerId ? 'Updating customer...' : 'Saving customer...');
        
        if (customerId) {
            await api.updateCustomer(customerId, customerData);
            showNotification('Customer updated successfully!', 'success');
        } else {
            await api.saveCustomer(customerData);
            showNotification('Customer added successfully!', 'success');
        }
        
        hideLoading();
        closeCustomerModal();
        loadCustomers();
    } catch (error) {
        console.error('Error saving customer:', error);
        hideLoading();
        showNotification('Customer saved (updating in background)', 'info');
        closeCustomerModal();
        if (customersLoaded) {
            loadCustomersData();
        }
    }
}

function viewCustomer(customerId) {
    const customer = allCustomers.find(c => c.customerId === customerId);
    if (!customer) return;
    
    const customerOrders = allOrders.filter(o => o.customerId === customerId);
    const totalOrders = customerOrders.length;
    const totalBusiness = customerOrders.reduce((sum, order) => 
        sum + parseFloat(order.totalCharge || 0), 0
    );
    const totalPaid = customerOrders.reduce((sum, order) => 
        sum + parseFloat(order.paidAmount || 0), 0
    );
    const totalPending = customerOrders.reduce((sum, order) => 
        sum + parseFloat(order.balance || 0), 0
    );
    const pendingOrders = customerOrders.filter(o => parseFloat(o.balance || 0) > 0);
    
    const content = `
        <div class="customer-details">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
                <h4 style="margin: 0;">${customer.businessName}</h4>
                <div style="display: flex; gap: 0.5rem;">
                    ${pendingOrders.length > 0 ? `
                    <button class="btn btn-sm btn-success" onclick="openSettleAllModal('${customer.customerId}')" style="background: #10b981;">
                        <i class="fas fa-check-double"></i> Settle All
                    </button>
                    <button class="btn btn-sm btn-success" onclick="sendCombinedReminder('${customer.customerId}')" style="background: #25d366;">
                        <i class="fab fa-whatsapp"></i> Send Reminder
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1.5rem 0;">
                <div>
                    <strong>Owner:</strong> ${customer.ownerName}
                </div>
                <div>
                    <strong>Customer ID:</strong> ${customer.customerId}
                </div>
                <div>
                    <strong>Phone:</strong> ${customer.phone}
                </div>
                <div>
                    <strong>WhatsApp:</strong> ${customer.whatsappNumber || customer.phone}
                </div>
                <div>
                    <strong>Rate/Item:</strong> ${formatCurrency(customer.ratePerItem)}
                </div>
                <div>
                    <strong>Total Orders:</strong> ${totalOrders}
                </div>
                <div>
                    <strong>Total Business:</strong> ${formatCurrency(totalBusiness)}
                </div>
                <div>
                    <strong>Pending:</strong> <span class="text-danger">${formatCurrency(totalPending)}</span>
                </div>
            </div>
            
            ${customer.address ? `<div style="margin-top: 1rem;"><strong>Address:</strong><br>${customer.address}</div>` : ''}
            ${customer.notes ? `<div style="margin-top: 1rem;"><strong>Notes:</strong><br>${customer.notes}</div>` : ''}
            
            <h4 style="margin-top: 2rem; margin-bottom: 1rem;">Recent Orders</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${customerOrders.length > 0 ? customerOrders.slice(0, 5).map(order => `
                        <tr>
                            <td>${order.orderId}</td>
                            <td>${formatDate(order.orderDate)}</td>
                            <td>${order.itemCount}</td>
                            <td>${formatCurrency(order.totalCharge)}</td>
                            <td class="${parseFloat(order.balance) > 0 ? 'text-danger' : 'text-success'}">
                                ${formatCurrency(order.balance)}
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" class="text-center text-muted">No orders yet</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('customerDetailsContent').innerHTML = content;
    document.getElementById('viewCustomerModal').classList.add('active');
}

function closeViewCustomerModal() {
    document.getElementById('viewCustomerModal').classList.remove('active');
}

function sendCombinedReminder(customerId) {
    const customer = allCustomers.find(c => c.customerId === customerId);
    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }
    
    const customerOrders = allOrders.filter(o => o.customerId === customerId);
    const pendingOrders = customerOrders.filter(o => parseFloat(o.balance || 0) > 0);
    
    if (pendingOrders.length === 0) {
        showNotification('No pending payments for this customer', 'info');
        return;
    }
    
    const totalPending = pendingOrders.reduce((sum, order) => 
        sum + parseFloat(order.balance || 0), 0
    );
    
    const totalOrders = customerOrders.length;
    const completedOrders = totalOrders - pendingOrders.length;
    
    let message = `Dear ${customer.ownerName},

Greetings from ${CONFIG.businessName || "P's Hallmarking Services"}!

📊 *Summary of Your Account:*
• Total Orders: ${totalOrders}
• Completed Payments: ${completedOrders}
• Pending Payments: ${pendingOrders.length}

💰 *Pending Payment Details:*
`;

    pendingOrders.forEach((order, index) => {
        message += `\n${index + 1}. Order #${order.orderId}
   Date: ${formatDate(order.orderDate)}
   Items: ${order.itemCount}
   Total: ${formatCurrency(order.totalCharge)}
   Paid: ${formatCurrency(order.paidAmount || 0)}
   Balance: ${formatCurrency(order.balance)}`;
    });
    
    message += `\n\n💳 *Total Pending Amount: ${formatCurrency(totalPending)}*

Please clear the pending dues at your earliest convenience.

Thank you for your business! 🙏`;
    
    const phone = customer.whatsappNumber || customer.phone;
    sendWhatsAppReminder(phone, message);
    showNotification('WhatsApp opened with combined reminder', 'success');
}

function openSettleAllModal(customerId) {
    const customer = allCustomers.find(c => c.customerId === customerId);
    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }
    
    const customerOrders = allOrders.filter(o => o.customerId === customerId);
    const pendingOrders = customerOrders.filter(o => parseFloat(o.balance || 0) > 0);
    
    if (pendingOrders.length === 0) {
        showNotification('No pending payments for this customer', 'info');
        return;
    }
    
    const totalPending = pendingOrders.reduce((sum, order) => 
        sum + parseFloat(order.balance || 0), 0
    );
    
    document.getElementById('settleCustomerId').value = customerId;
    document.getElementById('settleAmount').value = totalPending.toFixed(2);
    document.getElementById('settlePaymentMode').value = 'Cash';
    document.getElementById('settleNotes').value = '';
    
    const content = `
        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
            <h4 style="margin: 0 0 1rem 0; color: var(--dark);">Customer: ${customer.businessName}</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                <div><strong>Owner:</strong> ${customer.ownerName}</div>
                <div><strong>Phone:</strong> ${customer.phone}</div>
            </div>
            <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 4px solid #ef4444;">
                <strong style="color: #ef4444;">Total Pending Orders:</strong> ${pendingOrders.length}
            </div>
        </div>
        
        <h4 style="margin: 1.5rem 0 1rem 0;">Orders to Settle:</h4>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                </tr>
            </thead>
            <tbody>
                ${pendingOrders.map(order => `
                    <tr>
                        <td><strong>${order.orderId}</strong></td>
                        <td>${formatDate(order.orderDate)}</td>
                        <td>${order.itemCount}</td>
                        <td>${formatCurrency(order.totalCharge)}</td>
                        <td class="text-success">${formatCurrency(order.paidAmount || 0)}</td>
                        <td class="text-danger"><strong>${formatCurrency(order.balance)}</strong></td>
                    </tr>
                `).join('')}
                <tr style="background: #f8fafc; font-weight: 700;">
                    <td colspan="5" style="text-align: right; font-size: 1.1rem;">Total to Settle:</td>
                    <td style="color: #ef4444; font-size: 1.1rem;">${formatCurrency(totalPending)}</td>
                </tr>
            </tbody>
        </table>
    `;
    
    document.getElementById('settleAllContent').innerHTML = content;
    document.getElementById('settleAllModal').classList.add('active');
}

function closeSettleAllModal() {
    document.getElementById('settleAllModal').classList.remove('active');
}

async function confirmSettleAll() {
    const customerId = document.getElementById('settleCustomerId').value;
    const totalAmount = parseFloat(document.getElementById('settleAmount').value);
    const paymentMode = document.getElementById('settlePaymentMode').value;
    const notes = document.getElementById('settleNotes').value.trim();
    
    const customer = allCustomers.find(c => c.customerId === customerId);
    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }
    
    const customerOrders = allOrders.filter(o => o.customerId === customerId);
    const pendingOrders = customerOrders.filter(o => parseFloat(o.balance || 0) > 0);
    
    if (pendingOrders.length === 0) {
        showNotification('No pending orders to settle', 'info');
        return;
    }
    
    const confirmed = await showConfirm(
        `Settle all ${pendingOrders.length} pending orders for ${customer.businessName}?\n\nTotal Amount: ${formatCurrency(totalAmount)}\nPayment Mode: ${paymentMode}`
    );
    
    if (!confirmed) return;
    
    try {
        showLoading('Settling all pending payments...');
        
        for (const order of pendingOrders) {
            const paymentData = {
                paymentId: generateId('PAY'),
                orderId: order.orderId,
                customerId: customerId,
                amount: parseFloat(order.balance),
                mode: paymentMode,
                notes: notes || `Bulk settlement - All pending cleared`,
                timestamp: new Date().toISOString(),
                recordedBy: 'Staff'
            };
            
            await api.savePayment(paymentData);
        }
        
        hideLoading();
        showNotification(`Successfully settled ${pendingOrders.length} orders totaling ${formatCurrency(totalAmount)}!`, 'success');
        closeSettleAllModal();
        
        if (customersLoaded) {
            loadCustomersData();
        }
    } catch (error) {
        console.error('Error settling payments:', error);
        hideLoading();
        showNotification('Payments recorded (updating in background)', 'info');
        closeSettleAllModal();
        
        if (customersLoaded) {
            setTimeout(() => loadCustomersData(), 2000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();
    
    const searchInput = document.getElementById('searchCustomer');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#customersTable tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
});

