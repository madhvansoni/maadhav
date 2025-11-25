
class AdminView {
    constructor() {
        this.elements = {
            totalOrders: document.getElementById('totalOrders'),
            todayOrders: document.getElementById('todayOrders'),
            todayRevenue: document.getElementById('todayRevenue'),
            searchInput: document.getElementById('searchInput'),
            sortSelect: document.getElementById('sortSelect'),
            statusFilter: document.getElementById('statusFilter'),
            refreshBtn: document.getElementById('refreshBtn'),
            ordersTableBody: document.getElementById('ordersTableBody'),
            loadingState: document.getElementById('loadingState'),
            errorState: document.getElementById('errorState'),
            emptyState: document.getElementById('emptyState'),
            ordersSection: document.getElementById('ordersSection'),
            errorMessage: document.getElementById('errorMessage')
        };
    }

    updateSummary(summary) {
        this.elements.totalOrders.textContent = summary.totalOrders;
        this.elements.todayOrders.textContent = summary.todayOrders;
        this.elements.todayRevenue.textContent = `₹${summary.todayRevenue}`;
    }

    renderOrders(orders) {
        const tbody = this.elements.ordersTableBody;
        const emptyState = this.elements.emptyState;

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        tbody.innerHTML = orders.map(order => {
            const status = order.status || 'Pending';
            const statusClass = `status-${status.toLowerCase()}`;
            return `
            <tr>
                <td class="order-id">${order.orderId || 'N/A'}</td>
                <td class="order-delivery-date">
                    <strong>${order.deliveryDate || 'N/A'}</strong>
                </td>
                <td class="order-delivery-time">
                    <strong style="color: #43A047;">${order.deliveryTime || 'N/A'}</strong>
                </td>
                <td class="order-address">
                    <div><strong>${order.flat || 'N/A'}</strong></div>
                    <div style="font-size: 0.9em; color: #636e72;">${order.apartment || 'N/A'}</div>
                </td>
                <td class="order-items">${this.formatItems(order.items)}</td>
                <td class="order-total">
                    <strong style="color: #43A047;">${order.total || 'N/A'}</strong>
                </td>
                <td class="order-status">
                    <span class="status-badge ${statusClass}" data-order-id="${order.orderId}" data-status="${status}" title="Click to change status">
                        ${status}
                    </span>
                </td>
                <td class="order-timestamp">
                    <div style="font-size: 0.85em; color: #95a5a6;">${this.formatTimestamp(order.timestamp)}</div>
                </td>
            </tr>
            `;
        }).join('');
    }

    formatItems(items) {
        if (!items) return 'N/A';
        return items.split(',').map(item => item.trim()).join('<br>');
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';

        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return 'Invalid date';
        }
    }

    showLoading() {
        this.elements.loadingState.style.display = 'block';
        this.elements.errorState.style.display = 'none';
        this.elements.ordersSection.style.display = 'none';
    }

    hideLoading() {
        this.elements.loadingState.style.display = 'none';
    }

    showOrdersSection() {
        this.elements.ordersSection.style.display = 'block';
    }

    showError(message) {
        this.elements.loadingState.style.display = 'none';
        this.elements.ordersSection.style.display = 'none';
        this.elements.errorState.style.display = 'block';
        this.elements.errorMessage.textContent = message;
    }

    getSearchQuery() {
        return this.elements.searchInput.value;
    }

    getSortOption() {
        return this.elements.sortSelect.value;
    }

    getStatusFilter() {
        return this.elements.statusFilter.value;
    }

    disableRefresh() {
        this.elements.refreshBtn.disabled = true;
    }

    enableRefresh() {
        this.elements.refreshBtn.disabled = false;
    }
}

