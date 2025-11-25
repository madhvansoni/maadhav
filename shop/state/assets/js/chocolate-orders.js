function getWebAppUrl() {
    let savedUrl = localStorage.getItem('littleTreat_webAppUrl');
    
    if (savedUrl) {
        return savedUrl;
    }
    
    if (typeof ServiceConfig !== 'undefined') {
        savedUrl = ServiceConfig.getScriptUrl();
        if (savedUrl) {
            return savedUrl;
        }
    }
    alert('Configuration required. Redirecting to setup page...');
    window.location.href = '/setup.html';
    return null;
}

const WEB_APP_URL = getWebAppUrl();
let allOrders = [];
let currentFilter = 'all';

async function loadOrders() {
    if (!WEB_APP_URL) return;
    
    try {
        const fetchUrl = `${WEB_APP_URL}?sheet=chocolates_orders`;        
        const response = await fetch(fetchUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();        
        if (data.orders && data.orders.length > 0) {
            const firstOrder = data.orders[0];
            
            if (firstOrder.deliveryDate) {
                console.warn('⚠️ WARNING: Receiving FOOD orders (has deliveryDate)');
                console.warn('Expected chocolate orders (should have flatNumber, apartmentName)');
            } else if (firstOrder.flatNumber) {
                console.log('✅ Correct: Receiving CHOCOLATE orders');
            }
        }
        
        if (data.status === 'success' && data.orders) {
            allOrders = data.orders;
            updateStats();
            displayOrders(allOrders);
        } else {
            showEmptyState();
        }
    } catch (error) {
        document.getElementById('ordersContent').innerHTML = `
            <div class="empty-state">
                <p style="color: #dc3545;">Error loading orders. Please check your connection.</p>
            </div>
        `;
    }
}

function updateStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'Pending').length;
    const inProgress = allOrders.filter(o => o.status === 'In Progress').length;
    const revenue = allOrders.reduce((sum, order) => {
        const amount = parseFloat(order.total.replace(/[^0-9.-]+/g, '')) || 0;
        return sum + amount;
    }, 0);
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('pendingOrders').textContent = `${pending} / ${inProgress}`;
    document.getElementById('totalRevenue').textContent = `₹${revenue.toLocaleString()}`;
}

async function handleStatusChange(event) {
    const dropdown = event.target;
    const orderId = dropdown.dataset.orderId;
    const rowIndex = dropdown.dataset.rowIndex;
    const newStatus = dropdown.value;
    const oldStatus = allOrders.find(o => o.orderId === orderId)?.status;
    dropdown.disabled = true;
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateChocolateStatus',
                orderId: orderId,
                status: newStatus,
                rowIndex: rowIndex
            })
        });

        const order = allOrders.find(o => o.orderId === orderId);
        if (order) {
            order.status = newStatus;
            updateStats();
        }
        
        dropdown.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            dropdown.style.backgroundColor = '';
        }, 1000);

    } catch (error) {
        console.error('Error updating status:', error);
        dropdown.value = oldStatus;      
        dropdown.style.backgroundColor = '#f8d7da';
        setTimeout(() => {
            dropdown.style.backgroundColor = '';
        }, 2000);
    } finally {
        dropdown.disabled = false;
    }
}

function displayOrders(orders) {
    const container = document.getElementById('ordersContent');
    
    if (orders.length === 0) {
        showEmptyState();
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">${order.orderId}</div>
                    <div class="order-time">${formatDate(order.timestamp)}</div>
                </div>
                <div class="status-selector">
                    <select class="status-dropdown" data-order-id="${order.orderId}" data-row-index="${order.rowIndex || ''}">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Dispatched" ${order.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </div>
            </div>
            <div class="order-details">
                <div class="detail-item">
                    <span class="detail-label">Flat Number</span>
                    <span class="detail-value">${order.flatNumber || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Apartment</span>
                    <span class="detail-value">${order.apartmentName || 'N/A'}</span>
                </div>
            </div>
            <div class="order-items">
                <div class="items-title">Order Items:</div>
                <div>${order.items}</div>
                <div class="order-total">${order.total}</div>
            </div>
        </div>
    `).join('');
    
    container.querySelectorAll('.status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', handleStatusChange);
    });
}

function showEmptyState() {
    document.getElementById('ordersContent').innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <h3>No orders found</h3>
            <p>Orders will appear here once customers start placing chocolate orders.</p>
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return date.toLocaleDateString('en-IN', options);
}

function filterOrders() {
    let filtered = allOrders;
    if (currentFilter !== 'all') {
        filtered = filtered.filter(order => order.status === currentFilter);
    }
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.orderId.toLowerCase().includes(searchTerm) ||
            (order.flatNumber && order.flatNumber.toLowerCase().includes(searchTerm)) ||
            (order.apartmentName && order.apartmentName.toLowerCase().includes(searchTerm)) ||
            order.items.toLowerCase().includes(searchTerm)
        );
    }
    displayOrders(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterOrders();
        });
    });
    document.getElementById('searchInput').addEventListener('input', filterOrders);
    loadOrders();
});

