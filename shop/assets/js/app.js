class MenuModel {
    constructor(dataUrl) {
        this.dataUrl = dataUrl;
        this.categories = [];
        this.itemsById = new Map();
        this.quantities = new Map();
    }

    async loadMenu() {
        try {
            const response = await fetch(this.dataUrl);

            if (!response.ok) {
                throw new Error(`Unable to load menu data (${response.status})`);
            }

            const data = await response.json();
            this.categories = Array.isArray(data.categories) ? data.categories : [];
            this.itemsById.clear();
            this.quantities.clear();

            this.categories.forEach((category) => {
                (category.items || []).forEach((item) => {
                    this.itemsById.set(item.id, { ...item, categoryId: category.id });
                    this.quantities.set(item.id, 0);
                });
            });

            return this.categories;
        } catch (error) {
            
            if (window.MENU_DATA_FALLBACK) {
                console.log('Using fallback menu data');
                const data = window.MENU_DATA_FALLBACK;
                this.categories = Array.isArray(data.categories) ? data.categories : [];
                this.itemsById.clear();
                this.quantities.clear();

                this.categories.forEach((category) => {
                    (category.items || []).forEach((item) => {
                        this.itemsById.set(item.id, { ...item, categoryId: category.id });
                        this.quantities.set(item.id, 0);
                    });
                });

                return this.categories;
            }
            
            throw error;
        }
    }

    setQuantity(itemId, quantity) {
        if (!this.itemsById.has(itemId)) {
            throw new Error(`Unknown menu item: ${itemId}`);
        }

        const safeQuantity = Math.max(0, quantity);
        this.quantities.set(itemId, safeQuantity);
        return safeQuantity;
    }

    getQuantity(itemId) {
        return this.quantities.get(itemId) ?? 0;
    }

    getSelectedItems() {
        const selected = [];

        this.quantities.forEach((quantity, itemId) => {
            if (quantity > 0) {
                const item = this.itemsById.get(itemId);
                if (item) {
                    selected.push({
                        ...item,
                        quantity,
                        subtotal: quantity * item.price
                    });
                }
            }
        });

        return selected;
    }

    getOrderTotal() {
        return this.getSelectedItems().reduce((total, item) => total + item.subtotal, 0);
    }
}

class MenuView {
    constructor() {
        this.menuRoot = document.getElementById('menu-root');
        this.orderList = document.getElementById('order-items');
        this.orderTotal = document.getElementById('order-total');
        this.proceedButton = document.getElementById('proceed-btn');
        this.bookOrderButton = document.getElementById('book-order');
        this.backButton = document.getElementById('back-btn');
        this.step1 = document.getElementById('step1');
        this.step2 = document.getElementById('step2');
        this.flatNumberInput = document.getElementById('flatNumber');
        this.apartmentNameInput = document.getElementById('apartmentName');
        this.finalOrderSummary = document.getElementById('final-order-summary');
        this.finalTotalPrice = document.getElementById('finalTotalPrice');
        this.addressError = document.getElementById('addressError');
        
        this.categoryMenuBtn = document.getElementById('category-menu-btn');
        this.categoryMenu = document.getElementById('category-menu');
        this.closeCategoryMenu = document.getElementById('close-category-menu');
        this.categoryOverlay = document.getElementById('category-overlay');
        this.categoryList = document.getElementById('category-list');
        this.stickyCart = document.getElementById('sticky-cart');
        this.cartCount = document.getElementById('cart-count');
        this.cartTotalSticky = document.getElementById('cart-total-sticky');
        this.viewCartBtn = document.getElementById('view-cart-btn');
        
        // New elements
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImg = document.getElementById('lightbox-img');
        this.lightboxTitle = document.getElementById('lightbox-title');
        this.lightboxPrice = document.getElementById('lightbox-price');
        
        this.setupLightbox();
        
        this.currencyFormatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        });

        this.menuObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        this.menuObserver.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.15,
                rootMargin: '0px 0px -50px 0px'
            }
        );
    }
    
    setupLightbox() {
        if (!this.lightbox) return;
        
        const closeBtn = this.lightbox.querySelector('.lightbox__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeLightbox());
        }
        
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.closeLightbox();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.lightbox.style.display !== 'none') {
                this.closeLightbox();
            }
        });
    }
    
    showToast(message) {
        if (!this.toast || !this.toastMessage) return;
        
        this.toastMessage.textContent = message;
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2500);
    }
    
    openLightbox(imageSrc, title, price) {
        if (!this.lightbox) return;
        
        this.lightboxImg.src = imageSrc;
        this.lightboxTitle.textContent = title;
        this.lightboxPrice.textContent = price;
        this.lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    closeLightbox() {
        if (!this.lightbox) return;
        
        this.lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    pulseCart() {
        if (!this.stickyCart) return;
        
        this.stickyCart.classList.remove('pulse');
        void this.stickyCart.offsetWidth; // Trigger reflow
        this.stickyCart.classList.add('pulse');
    }

    renderMenu(categories) {
        if (!this.menuRoot) {
            return;
        }

        this.menuRoot.innerHTML = '';
        const fragment = document.createDocumentFragment();

        categories.forEach((category) => {
            const section = this.createCategorySection(category);
            fragment.appendChild(section);
        });

        this.menuRoot.appendChild(fragment);
        this.renderCategoryMenu(categories);
    }
    
    renderCategoryMenu(categories) {
        if (!this.categoryList) return;
        
        this.categoryList.innerHTML = '';
        
        categories.forEach((category) => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.dataset.categoryId = category.id;
            
            const icon = document.createElement('div');
            icon.className = 'category-icon';
            icon.textContent = category.items?.[0]?.icon || '🍫';
            
            const info = document.createElement('div');
            info.className = 'category-info';
            
            const name = document.createElement('div');
            name.className = 'category-name';
            name.textContent = category.name;
            
            const count = document.createElement('div');
            count.className = 'category-count';
            count.textContent = `${category.items?.length || 0} items`;
            
            info.appendChild(name);
            info.appendChild(count);
            item.appendChild(icon);
            item.appendChild(info);
            
            this.categoryList.appendChild(item);
        });
    }

    createCategorySection(category) {
        const section = document.createElement('section');
        section.className = 'menu-category';
        section.setAttribute('role', 'listitem');
        section.id = `category-${category.id}`;

        const header = document.createElement('header');
        header.className = 'menu-category__header';

        const title = document.createElement('h3');
        title.className = 'menu-category__title';
        title.textContent = category.name;
        header.appendChild(title);

        if (category.description) {
            const description = document.createElement('p');
            description.className = 'menu-category__description';
            description.textContent = category.description;
            header.appendChild(description);
        }

        section.appendChild(header);

        const itemsWrapper = document.createElement('div');
        itemsWrapper.className = 'menu-items';

        (category.items || []).forEach((item) => {
            const card = this.createMenuItemCard(item);
            itemsWrapper.appendChild(card);
            this.menuObserver.observe(card);
        });

        section.appendChild(itemsWrapper);
        return section;
    }

    createMenuItemCard(item) {
        const card = document.createElement('article');
        card.className = 'menu-item';
        card.dataset.itemId = item.id;

        // Content section (left side)
        const content = document.createElement('div');
        content.className = 'menu-item__content';

        // Header with name only
        const header = document.createElement('div');
        header.className = 'menu-item__header';

        const name = document.createElement('h4');
        name.className = 'menu-item__name';
        
        // Only add icon if NO image is available
        if (item.icon && !item.image) {
            const icon = document.createElement('span');
            icon.className = 'menu-item__icon';
            icon.textContent = item.icon;
            name.appendChild(icon);
        }
        
        const nameText = document.createTextNode(item.name);
        name.appendChild(nameText);

        // Best Seller badge inline with name
        if (item.bestSeller) {
            const badge = document.createElement('span');
            badge.className = 'menu-item__badge';
            badge.innerHTML = '<i class="fas fa-fire"></i> Best Seller';
            name.appendChild(badge);
        }

        header.appendChild(name);

        content.appendChild(header);

        // Description
        if (item.description) {
            const description = document.createElement('p');
            description.className = 'menu-item__description';
            description.textContent = item.description;
            content.appendChild(description);
        }

        // Price after description
        const price = document.createElement('div');
        price.className = 'menu-item__price';
        price.textContent = this.currencyFormatter.format(item.price);
        content.appendChild(price);

        card.appendChild(content);

        // Image section (right side) with Add button overlay
        if (item.image) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'menu-item__image-container';
            
            const image = document.createElement('img');
            image.className = 'menu-item__image';
            image.src = item.image;
            image.alt = item.name;
            image.loading = 'lazy';
            
            image.onerror = () => {
                imageContainer.innerHTML = '';
                if (item.icon) {
                    const icon = document.createElement('span');
                    icon.className = 'menu-item__icon-fallback';
                    icon.textContent = item.icon;
                    imageContainer.appendChild(icon);
                }
            };
            
            // Click image to open lightbox
            image.style.cursor = 'zoom-in';
            image.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openLightbox(item.image, item.name, this.currencyFormatter.format(item.price));
            });
            
            imageContainer.appendChild(image);

            // Add button overlay at bottom of image
            const addButtonOverlay = document.createElement('div');
            addButtonOverlay.className = 'menu-item__add-overlay';

            // ADD button (shown when quantity is 0)
            const addButton = document.createElement('button');
            addButton.className = 'add-button';
            addButton.type = 'button';
            addButton.dataset.action = 'add';
            addButton.dataset.itemId = item.id;
            addButton.setAttribute('aria-label', `Add ${item.name}`);
            addButton.textContent = 'ADD';

            // Quantity selector (shown when quantity > 0)
            const quantity = document.createElement('div');
            quantity.className = 'quantity-selector';
            quantity.style.display = 'none'; // Hidden initially

            const decrement = document.createElement('button');
            decrement.className = 'quantity-button';
            decrement.type = 'button';
            decrement.dataset.action = 'decrease';
            decrement.dataset.itemId = item.id;
            decrement.setAttribute('aria-label', `Remove one ${item.name}`);
            decrement.innerHTML = '<i class="fas fa-minus"></i>';

            const value = document.createElement('span');
            value.className = 'quantity-value';
            value.dataset.quantityFor = item.id;
            value.textContent = '0';

            const increment = document.createElement('button');
            increment.className = 'quantity-button';
            increment.type = 'button';
            increment.dataset.action = 'increase';
            increment.dataset.itemId = item.id;
            increment.setAttribute('aria-label', `Add one ${item.name}`);
            increment.innerHTML = '<i class="fas fa-plus"></i>';

            quantity.append(decrement, value, increment);
            addButtonOverlay.appendChild(addButton);
            addButtonOverlay.appendChild(quantity);
            imageContainer.appendChild(addButtonOverlay);
            
            card.appendChild(imageContainer);
        } else {
            // If no image, show controls below content
            const controls = document.createElement('div');
            controls.className = 'menu-item__controls';

            // ADD button (shown when quantity is 0)
            const addButton = document.createElement('button');
            addButton.className = 'add-button';
            addButton.type = 'button';
            addButton.dataset.action = 'add';
            addButton.dataset.itemId = item.id;
            addButton.setAttribute('aria-label', `Add ${item.name}`);
            addButton.textContent = 'ADD';

            // Quantity selector (shown when quantity > 0)
            const quantity = document.createElement('div');
            quantity.className = 'quantity-selector';
            quantity.style.display = 'none'; // Hidden initially

            const decrement = document.createElement('button');
            decrement.className = 'quantity-button';
            decrement.type = 'button';
            decrement.dataset.action = 'decrease';
            decrement.dataset.itemId = item.id;
            decrement.setAttribute('aria-label', `Remove one ${item.name}`);
            decrement.innerHTML = '<i class="fas fa-minus"></i>';

            const value = document.createElement('span');
            value.className = 'quantity-value';
            value.dataset.quantityFor = item.id;
            value.textContent = '0';

            const increment = document.createElement('button');
            increment.className = 'quantity-button';
            increment.type = 'button';
            increment.dataset.action = 'increase';
            increment.dataset.itemId = item.id;
            increment.setAttribute('aria-label', `Add one ${item.name}`);
            increment.innerHTML = '<i class="fas fa-plus"></i>';

            quantity.append(decrement, value, increment);
            controls.appendChild(addButton);
            controls.appendChild(quantity);
            content.appendChild(controls);
        }

        return card;
    }

    bindQuantityChange(handler) {
        if (!this.menuRoot) return;

        this.menuRoot.addEventListener('click', (event) => {
            // Check for ADD button
            const addButton = event.target.closest('.add-button');
            if (addButton) {
                const itemId = addButton.dataset.itemId;
                if (itemId) {
                    handler(itemId, 1);
                }
                return;
            }

            // Check for quantity buttons (+ or -)
            const target = event.target.closest('.quantity-button');
            if (!target) return;

            const itemId = target.dataset.itemId;
            const action = target.dataset.action;

            if (!itemId || !action) return;

            const delta = action === 'increase' ? 1 : -1;
            handler(itemId, delta);
        });
    }

    bindProceedToAddress(handler) {
        if (!this.proceedButton) return;
        this.proceedButton.addEventListener('click', handler);
    }

    bindBackToMenu(handler) {
        if (!this.backButton) return;
        this.backButton.addEventListener('click', handler);
    }

    bindBookOrder(handler) {
        if (!this.bookOrderButton) return;
        this.bookOrderButton.addEventListener('click', handler);
    }



    updateQuantityDisplay(itemId, quantity) {
        const element = this.menuRoot?.querySelector(`[data-quantity-for="${itemId}"]`);
        if (element) {
            element.textContent = String(quantity);
        }

        // Toggle between ADD button and quantity selector
        const menuItem = this.menuRoot?.querySelector(`[data-item-id="${itemId}"]`);
        if (menuItem) {
            const addButton = menuItem.querySelector('.add-button');
            const quantitySelector = menuItem.querySelector('.quantity-selector');

            if (addButton && quantitySelector) {
                if (quantity > 0) {
                    addButton.style.display = 'none';
                    quantitySelector.style.display = 'flex';
                } else {
                    addButton.style.display = 'block';
                    quantitySelector.style.display = 'none';
                }
            }
        }
    }

    updateOrderSummary(items, total) {
        // Always update sticky cart first
        this.updateStickyCart(items.length, total);
        
        // Only update order summary if elements exist
        if (!this.orderList || !this.orderTotal) return;

        this.orderList.innerHTML = '';

        if (items.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'empty-cart-state';
            emptyState.innerHTML = `
                <div class="empty-cart-state__icon">🛒</div>
                <p class="empty-cart-state__text">Your cart is empty</p>
                <p class="empty-cart-state__hint">Tap ADD on items to get started</p>
            `;
            this.orderList.appendChild(emptyState);
        } else {
            const fragment = document.createDocumentFragment();
            items.forEach((item) => {
                const listItem = document.createElement('li');
                listItem.className = 'order-summary__item';

                const name = document.createElement('span');
                name.textContent = `${item.name} × ${item.quantity}`;

                const subtotal = document.createElement('strong');
                subtotal.textContent = this.currencyFormatter.format(item.subtotal);

                listItem.append(name, subtotal);
                fragment.appendChild(listItem);
            });

            this.orderList.appendChild(fragment);
        }

        this.orderTotal.textContent = this.currencyFormatter.format(total);
    }
    
    updateStickyCart(itemCount, total) {
        if (!this.stickyCart || !this.cartCount || !this.cartTotalSticky) return;
        
        if (itemCount > 0) {
            this.cartCount.textContent = `${itemCount} item${itemCount > 1 ? 's' : ''}`;
            this.cartTotalSticky.textContent = this.currencyFormatter.format(total);
            this.stickyCart.style.display = 'block';
        } else {
            this.stickyCart.style.display = 'none';
        }
    }
    
    showCategoryMenu() {
        if (this.categoryMenu && this.categoryOverlay) {
            this.categoryMenu.style.display = 'flex';
            this.categoryOverlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    
    hideCategoryMenu() {
        if (this.categoryMenu && this.categoryOverlay) {
            this.categoryMenu.style.display = 'none';
            this.categoryOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    scrollToCategory(categoryId) {
        const categoryElement = document.getElementById(`category-${categoryId}`);
        if (categoryElement) {
            const quickInfoHeight = document.querySelector('.quick-info-banner')?.offsetHeight || 80;
            const elementPosition = categoryElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - quickInfoHeight - 20;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            this.hideCategoryMenu();
        }
    }
    
    scrollToOrderSummary() {
        const orderSummary = document.querySelector('.order-summary');
        if (orderSummary) {
            const quickInfoHeight = document.querySelector('.quick-info-banner')?.offsetHeight || 80;
            const elementPosition = orderSummary.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - quickInfoHeight - 20;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    updateFinalOrderSummary(items, total) {
        if (!this.finalOrderSummary || !this.finalTotalPrice) return;

        this.finalOrderSummary.innerHTML = '';

        if (items.length > 0) {
            const summaryDiv = document.createElement('div');
            summaryDiv.style.background = 'white';
            summaryDiv.style.padding = '1.5rem';
            summaryDiv.style.borderRadius = '12px';
            summaryDiv.style.border = '2px solid var(--light-purple)';

            const heading = document.createElement('h4');
            heading.textContent = '📋 Order Summary';
            heading.style.color = 'var(--deep-purple)';
            heading.style.marginBottom = '1rem';
            summaryDiv.appendChild(heading);

            items.forEach((item, index) => {
                const colorClass = `item-color-${index % 10}`;
                
                const row = document.createElement('div');
                row.className = 'order-row order-summary-item';
                
                const itemText = document.createElement('span');
                
                const itemName = document.createElement('strong');
                itemName.textContent = item.name;
                itemName.className = `order-item-name ${colorClass}`;
                
                const quantityText = document.createElement('span');
                quantityText.textContent = ` × ${item.quantity}`;
                quantityText.className = 'order-item-quantity';
                
                itemText.appendChild(itemName);
                itemText.appendChild(quantityText);
                
                const itemPrice = document.createElement('strong');
                itemPrice.textContent = this.currencyFormatter.format(item.subtotal);
                itemPrice.className = `order-item-price ${colorClass}`;
                
                row.appendChild(itemText);
                row.appendChild(itemPrice);
                summaryDiv.appendChild(row);
            });

            this.finalOrderSummary.appendChild(summaryDiv);
        }

        this.finalTotalPrice.textContent = this.currencyFormatter.format(total);
    }

    goToStep(step) {
        if (step === 1) {
            this.step1.style.display = 'block';
            this.step2.style.display = 'none';
            this.step1.classList.add('active');
            this.step2.classList.remove('active');
            const items = this.model?.getSelectedItems() || [];
            if (items.length > 0 && this.stickyCart) {
                this.stickyCart.style.display = 'block';
            }
        } else if (step === 2) {
            this.step1.style.display = 'none';
            this.step2.style.display = 'block';
            this.step1.classList.remove('active');
            this.step2.classList.add('active');
            if (this.stickyCart) {
                this.stickyCart.style.display = 'none';
            }
            
            setTimeout(() => {
                const quickInfoHeight = document.querySelector('.quick-info-banner')?.offsetHeight || 80;
                const elementPosition = this.step2.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - quickInfoHeight - 20;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }

    getAddressData() {
        return {
            flatNumber: this.flatNumberInput?.value.trim() || '',
            apartmentName: this.apartmentNameInput?.value.trim() || ''
        };
    }

    validateAddress() {
        const { flatNumber, apartmentName } = this.getAddressData();
        const isValid = flatNumber !== '' && apartmentName !== '';
        
        if (!isValid && this.addressError) {
            this.addressError.style.display = 'block';
        } else if (this.addressError) {
            this.addressError.style.display = 'none';
        }
        
        return isValid;
    }


    showEmptyOrderMessage() {
        window.alert('Please add at least one item before proceeding.');
    }

    showAddressErrorMessage() {
        window.alert('Please fill in both flat number and apartment name.');
    }
}

class MenuController {
    constructor({ model, view, whatsappNumber, sheetsService }) {
        this.model = model;
        this.view = view;
        this.whatsappNumber = (whatsappNumber || '+91 7874914422').replace(/\D/g, '');
        this.sheetsService = sheetsService;
    }

    async init() {
        try {
            const categories = await this.model.loadMenu();
            this.view.renderMenu(categories);
            this.view.updateOrderSummary([], 0);
            this.registerEvents();
        } catch (error) {
            this.showLoadError();
        }
    }

    registerEvents() {
        this.view.bindQuantityChange((itemId, delta) => {
            const currentQuantity = this.model.getQuantity(itemId);
            const nextQuantity = Math.max(0, currentQuantity + delta);
            this.model.setQuantity(itemId, nextQuantity);
            this.view.updateQuantityDisplay(itemId, nextQuantity);
            this.refreshSummary();
            
            // Show toast and pulse cart when adding item
            if (delta > 0 && nextQuantity === 1) {
                const item = this.model.itemsById.get(itemId);
                if (item) {
                    this.view.showToast(`${item.name} added to cart!`);
                }
            }
            
            if (delta > 0) {
                this.view.pulseCart();
            }
        });
        

        this.view.bindProceedToAddress(() => this.handleProceedToAddress());
        this.view.bindBackToMenu(() => this.handleBackToMenu());
        this.view.bindBookOrder(() => this.handleBookOrder());
        
        if (this.view.categoryMenuBtn) {
            this.view.categoryMenuBtn.addEventListener('click', () => {
                this.view.showCategoryMenu();
            });
        }
        
        if (this.view.closeCategoryMenu) {
            this.view.closeCategoryMenu.addEventListener('click', () => {
                this.view.hideCategoryMenu();
            });
        }
        
        if (this.view.categoryOverlay) {
            this.view.categoryOverlay.addEventListener('click', () => {
                this.view.hideCategoryMenu();
            });
        }
        
        if (this.view.categoryList) {
            this.view.categoryList.addEventListener('click', (e) => {
                const categoryItem = e.target.closest('.category-item');
                if (categoryItem) {
                    const categoryId = categoryItem.dataset.categoryId;
                    this.view.scrollToCategory(categoryId);
                }
            });
        }
        
        if (this.view.viewCartBtn) {
            this.view.viewCartBtn.addEventListener('click', () => {
                this.handleProceedToAddress();
            });
        }
        
        this.setupFloatingMenuVisibility();
    }
    
    setupFloatingMenuVisibility() {
        const menuSection = document.getElementById('menu');
        const floatingBtn = this.view.categoryMenuBtn;
        
        if (!menuSection || !floatingBtn) return;
        
        const checkVisibility = () => {
            const menuRect = menuSection.getBoundingClientRect();
            const isMenuVisible = menuRect.top < window.innerHeight && menuRect.bottom > 0;
            const isStep1Active = this.view.step1?.classList.contains('active');
            
            if (isMenuVisible && isStep1Active) {
                floatingBtn.classList.add('visible');
            } else {
                floatingBtn.classList.remove('visible');
            }
        };
        
        window.addEventListener('scroll', checkVisibility, { passive: true });
        setTimeout(checkVisibility, 500);
    }

    refreshSummary() {
        const items = this.model.getSelectedItems();
        const total = this.model.getOrderTotal();
        this.view.updateOrderSummary(items, total);
    }

    handleProceedToAddress() {
        const items = this.model.getSelectedItems();

        if (items.length === 0) {
            this.view.showEmptyOrderMessage();
            return;
        }

        const total = this.model.getOrderTotal();
        this.view.updateFinalOrderSummary(items, total);
        this.view.goToStep(2);
    }

    handleBackToMenu() {
        this.view.goToStep(1);
    }

    async handleBookOrder() {
        const items = this.model.getSelectedItems();

        if (items.length === 0) {
            this.view.showEmptyOrderMessage();
            return;
        }

        if (!this.view.validateAddress()) {
            this.view.showAddressErrorMessage();
            return;
        }

        const addressData = this.view.getAddressData();
        const total = this.model.getOrderTotal();

        const messageLines = [
            'Hello Little Treat,',
            '',
            'I would like to place an order for chocolates:',
            '',
            '📦 *Order Details:*',
            ...items.map((item) => `• ${item.name} × ${item.quantity} = ${this.view.currencyFormatter.format(item.subtotal)}`),
            '',
            `💰 *Total: ${this.view.currencyFormatter.format(total)}*`,
            '',
            '📍 *Delivery Address:*',
            `Flat: ${addressData.flatNumber}`,
            `Apartment: ${addressData.apartmentName}`,
            '',
            'Please confirm availability and delivery details.'
        ];

        const message = encodeURIComponent(messageLines.join('\n'));
        const whatsappUrl = `https://wa.me/${this.whatsappNumber}?text=${message}`;
        
        window.open(whatsappUrl, '_blank', 'noopener');

        if (this.sheetsService) {
            const orderData = {
                flatNumber: addressData.flatNumber,
                apartmentName: addressData.apartmentName,
                items: items.map(item => `${item.name} x ${item.quantity} pcs (₹${item.subtotal})`).join(', '),
                total: `₹${total}`
            };

            this.sheetsService.saveOrder(orderData).catch(error => {
                console.error('Failed to save order to Google Sheets:', error);
            });
        }
    }

    showLoadError() {
        if (!this.view.menuRoot) return;
        this.view.menuRoot.innerHTML = `
            <div class="menu-category">
                <div class="menu-category__header">
                    <h3 class="menu-category__title">Menu unavailable</h3>
                    <p class="menu-category__description">We couldn't load our treats right now. Please refresh the page or try again later.</p>
                </div>
            </div>
        `;
    }
}

class GoogleSheetsService {
    constructor(config) {
        this.method = config.method || 'appsScript';
        
        const savedUrl = localStorage.getItem('littleTreat_webAppUrl');
        const defaultUrl = typeof ServiceConfig !== 'undefined' ? ServiceConfig.getScriptUrl() : null;
        this.webAppUrl = savedUrl || defaultUrl || config.webAppUrl;
        
        this.sheetName = config.sheetName || 'chocolates_orders';
        this.enabled = config.enabled !== false;
    }

    async saveOrder(orderData) {
        if (!this.enabled || !this.webAppUrl) {
            return false;
        }

        try {
            const orderId = this.generateOrderId();
            const fullOrderData = {
                orderId: orderId,
                flatNumber: orderData.flatNumber,
                apartmentName: orderData.apartmentName,
                items: orderData.items,
                total: orderData.total,
                status: 'Pending',
                timestamp: new Date().toISOString(),
                sheetName: this.sheetName
            };

            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fullOrderData)
            });

            return true;
        } catch (error) {
            console.error('Error saving to Google Sheets:', error);
            return false;
        }
    }

    generateOrderId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const orderId = `#CHO${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
        return orderId;
    }
}

async function initApp() {
    try {
        let config = {
            googleSheets: {
                enabled: false,
                method: 'appsScript',
                webAppUrl: '',
                sheetName: 'chocolates_orders'
            },
            whatsappNumber: '+91 7874914422'
        };

        try {
            const configResponse = await fetch('shop/config.json');
            if (configResponse.ok) {
                const loadedConfig = await configResponse.json();
                config = {
                    ...config,
                    ...loadedConfig,
                    googleSheets: {
                        ...config.googleSheets,
                        ...(loadedConfig.googleSheets || {})
                    }
                };
            }
        } catch (error) {
            console.log('Config file not found, using defaults');
        }

        let sheetsService = null;
        if (config.googleSheets && config.googleSheets.enabled) {
            sheetsService = new GoogleSheetsService(config.googleSheets);
        }

        const app = new MenuController({
            model: new MenuModel('shop/data/menu.json'),
            view: new MenuView(),
            whatsappNumber: config.whatsappNumber || '+91 7874914422',
            sheetsService: sheetsService
        });

        await app.init();
        window.chocolateApp = app;
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

initApp();
