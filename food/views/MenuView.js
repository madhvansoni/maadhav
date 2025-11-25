class MenuView {
    constructor() {
        this.productSection = document.getElementById('step1');
        this.orderSummaryElement = document.getElementById('liveOrderSummary');
        this.finalTotalElement = document.getElementById('finalTotalPrice');
    }

    renderMenuItems(menuItems, onQuantityChange) {
        const proceedBtn = document.getElementById('proceedBtn');
        this.productSection.innerHTML = '';
        menuItems.forEach(item => {
            const productCard = this.createProductCard(item, onQuantityChange);
            this.productSection.appendChild(productCard);
        });
        if (proceedBtn) {
            this.productSection.appendChild(proceedBtn);
        }
    }

    createProductCard(item, onQuantityChange) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-item-id', item.id);

        const productInfo = document.createElement('div');
        productInfo.className = 'product-info';

        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.className = 'product-image';
            productInfo.appendChild(img);
        } else if (item.emoji) {
            const emoji = document.createElement('div');
            emoji.className = 'product-emoji';
            emoji.textContent = item.emoji;
            productInfo.appendChild(emoji);
        }

        const details = document.createElement('div');
        details.className = 'product-details';

        const title = document.createElement('h2');
        title.className = 'product-title';
        title.textContent = item.name;

        const description = document.createElement('p');
        description.className = 'product-description';
        description.textContent = item.description;

        const priceDisplay = document.createElement('div');
        priceDisplay.className = 'price-display';
        
        const unitText = this.getUnitDisplayText(item.unit);
        if (item.originalPrice) {
            priceDisplay.innerHTML = `<del>₹${item.originalPrice}</del> ₹${item.price} / ${unitText}`;
        } else {
            priceDisplay.textContent = `₹${item.price} Per ${unitText}`;
        }

        details.appendChild(title);
        details.appendChild(description);
        details.appendChild(priceDisplay);
        productInfo.appendChild(details);

        const quantityControls = this.createQuantityControls(item.id, 0, onQuantityChange);
        productInfo.appendChild(quantityControls);

        card.appendChild(productInfo);
        return card;
    }

    createQuantityControls(itemId, quantity, onQuantityChange) {
        const controls = document.createElement('div');
        controls.className = 'quantity-controls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantity-btn';
        minusBtn.textContent = '-';
        minusBtn.onclick = () => onQuantityChange(itemId, -1);

        const quantityDisplay = document.createElement('div');
        quantityDisplay.className = 'quantity-display';
        quantityDisplay.id = `qty-${itemId}`;
        quantityDisplay.textContent = quantity;

        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantity-btn';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => onQuantityChange(itemId, 1);

        controls.appendChild(minusBtn);
        controls.appendChild(quantityDisplay);
        controls.appendChild(plusBtn);

        return controls;
    }

    updateQuantityDisplay(itemId, quantity) {
        const quantityElement = document.getElementById(`qty-${itemId}`);
        if (quantityElement) {
            quantityElement.textContent = quantity;
        }
    }

    renderOrderSummary(cartItems, total) {
        let summaryHTML = '';
        
        cartItems.forEach(item => {
            const itemTotal = item.quantity * item.price;
            const unitDisplay = this.getUnitDisplayText(item.unit);
            summaryHTML += `
                <div class="summary-item">
                    <span>${item.emoji || '📦'} ${item.name} x ${item.quantity} ${unitDisplay}</span>
                    <span>₹${itemTotal}</span>
                </div>
            `;
        });

        if (this.orderSummaryElement) {
            this.orderSummaryElement.innerHTML = `<div class="order-summary">${summaryHTML}</div>`;
        }
        
        if (this.finalTotalElement) {
            this.finalTotalElement.textContent = `₹${total}`;
        }
    }

    getUnitDisplayText(unit) {
        const unitMap = {
            'piece': 'Piece',
            'kg': 'Kg',
            'plate': 'Plate',
            'dozen': 'Dozen'
        };
        return unitMap[unit.toLowerCase()] || unit;
    }

    showError(message) {
        alert(message);
    }

    showFieldError(fieldId, show) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.style.display = show ? 'block' : 'none';
        }
    }

    goToStep(step) {
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        const stepElement = document.getElementById(`step${step}`);
        if (stepElement) {
            stepElement.classList.add('active');
        }
        
        const progressSteps = document.querySelectorAll('.progress-step');
        if (progressSteps.length > 0) {
            progressSteps.forEach(s => {
                s.classList.remove('active');
                s.classList.remove('completed');
            });
            
            const currentStepIndicator = document.getElementById(`step${step}-indicator`);
            if (currentStepIndicator) {
                currentStepIndicator.classList.add('active');
            }
            
            for (let i = 1; i < step; i++) {
                const prevStepIndicator = document.getElementById(`step${i}-indicator`);
                if (prevStepIndicator) {
                    prevStepIndicator.classList.add('completed');
                }
            }
        }       
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    getFormValues() {
        return {
            flatNumber: document.getElementById('flatNumber')?.value.trim() || '',
            apartmentName: document.getElementById('apartmentName')?.value.trim() || '',
            dateSelect: document.getElementById('dateSelect')?.value || '',
            dateSelectText: document.getElementById('dateSelect')?.options[document.getElementById('dateSelect')?.selectedIndex]?.text || ''
        };
    }

    renderDeliveryDateTime(deliveryDate, timeSlots) {
        const dateLabel = document.querySelector('label[for="dateSelect"]') || 
                         document.querySelector('.form-label');
        
        if (dateLabel && deliveryDate) {
            dateLabel.innerHTML = `📅 Delivery Date & Time - ${deliveryDate.date} (${deliveryDate.dayName})`;
        }

        const dateSelect = document.getElementById('dateSelect');
        if (dateSelect && timeSlots.length > 0) {
            dateSelect.innerHTML = '';

            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            
            const firstSlot = timeSlots[0];
            const lastSlot = timeSlots[timeSlots.length - 1];
            placeholderOption.textContent = `(${firstSlot.label} - ${lastSlot.label})`;
            dateSelect.appendChild(placeholderOption);

            timeSlots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot.value;
                option.textContent = slot.label;
                dateSelect.appendChild(option);
            });
        }
    }

    getFormValuesLegacy() {
        return {
            flatNumber: document.getElementById('flatNumber')?.value.trim() || '',
            apartmentName: document.getElementById('apartmentName')?.value.trim() || '',
            dateSelect: document.getElementById('dateSelect')?.value || '',
            dateSelectText: document.getElementById('dateSelect')?.options[document.getElementById('dateSelect')?.selectedIndex]?.text || ''
        };
    }

    validateForm() {
        const formValues = this.getFormValues();
        let isValid = true;

        if (!formValues.dateSelect) {
            this.showFieldError('dateError', true);
            isValid = false;
        } else {
            this.showFieldError('dateError', false);
        }

        if (!formValues.flatNumber || !formValues.apartmentName) {
            this.showFieldError('addressError', true);
            isValid = false;
        } else {
            this.showFieldError('addressError', false);
        }

        return isValid;
    }
}

