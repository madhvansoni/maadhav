
class AdminController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.currentDisplayedOrders = [];
    }

    async init() {
        try {
            await this.model.loadConfig();
            await this.loadOrders();
            this.setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            this.view.showError('Failed to initialize dashboard');
        }
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                this.view.disableRefresh();
                await this.loadOrders();
                this.view.enableRefresh();
            });
        }
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.handleSearch();
            });
        }

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.handleSort();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.handleStatusFilter();
            });
        }

        const tableBody = document.getElementById('ordersTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const badge = e.target.closest('.status-badge');
                if (badge) {
                    const orderId = badge.dataset.orderId;
                    const currentStatus = badge.dataset.status;
                    this.cycleStatus(orderId, currentStatus);
                }
            });
        }
    }

    async loadOrders() {
        try {
            this.view.showLoading();

            await this.model.fetchOrders();
            this.currentDisplayedOrders = this.model.getAllOrders();

            this.applyFiltersAndSort();

            const summary = this.model.calculateSummary();
            this.view.updateSummary(summary);

            this.view.renderOrders(this.currentDisplayedOrders);

            this.view.hideLoading();
            this.view.showOrdersSection();

        } catch (error) {
            console.error('Error loading:', error);
            this.view.hideLoading();
            this.view.showError('Failed to load orders. Please try again.');
        }
    }

    handleSearch() {
        const query = this.view.getSearchQuery();
        const statusFilter = this.view.getStatusFilter();

        let filtered = this.model.getAllOrders();

        if (statusFilter !== 'all') {
            filtered = this.model.getOrdersByStatus(statusFilter);
        }

        if (query && query.trim() !== '') {
            filtered = this.model.searchOrders(query);
            
            if (statusFilter !== 'all') {
                filtered = filtered.filter(order => order.status === statusFilter);
            }
        }

        const sortBy = this.view.getSortOption();
        this.currentDisplayedOrders = this.model.sortOrders(filtered, sortBy);

        this.view.renderOrders(this.currentDisplayedOrders);
    }

    handleSort() {
        const sortBy = this.view.getSortOption();
        this.currentDisplayedOrders = this.model.sortOrders(this.currentDisplayedOrders, sortBy);
        this.view.renderOrders(this.currentDisplayedOrders);
    }

    handleStatusFilter() {
        this.applyFiltersAndSort();
    }

    applyFiltersAndSort() {
        const statusFilter = this.view.getStatusFilter();
        const searchQuery = this.view.getSearchQuery();
        const sortBy = this.view.getSortOption();

        let filtered = this.model.getOrdersByStatus(statusFilter);

        if (searchQuery && searchQuery.trim() !== '') {
            const searchResults = this.model.searchOrders(searchQuery);
            if (statusFilter !== 'all') {
                filtered = searchResults.filter(order => order.status === statusFilter);
            } else {
                filtered = searchResults;
            }
        }

        this.currentDisplayedOrders = this.model.sortOrders(filtered, sortBy);
        this.view.renderOrders(this.currentDisplayedOrders);
    }

    async cycleStatus(orderId, currentStatus) {
        const statusCycle = {
            'Pending': 'Dispatched',
            'Dispatched': 'Delivered',
            'Delivered': 'Pending'
        };

        const newStatus = statusCycle[currentStatus] || 'Pending';

        try {
            await this.updateOrderStatus(orderId, newStatus);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const webAppUrl = this.model.getWebAppUrl();

            await fetch(webAppUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateStatus',
                    orderId: orderId,
                    status: newStatus
                })
            });

            this.model.updateOrderStatus(orderId, newStatus);
            this.applyFiltersAndSort();
        } catch (error) {
            throw error;
        }
    }
}



