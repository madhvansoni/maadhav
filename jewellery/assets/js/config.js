let CONFIG = {};
let configLoaded = false;
let configPromise = null;

async function loadConfig() {
    if (configLoaded) {
        return CONFIG;
    }
    
    if (configPromise) {
        return configPromise;
    }
    
    configPromise = (async () => {
        try {
            const response = await fetch('config.json');
            CONFIG = await response.json();
            
            const storedUrl = localStorage.getItem('webAppUrl');
            
            if (!storedUrl) {
                window.location.href = 'setup.html';
                throw new Error('Setup required');
            }
            
            CONFIG.webAppUrl = storedUrl;
            configLoaded = true;            
            updateBusinessName();
            
            return CONFIG;
        } catch (error) {
            if (error.message !== 'Setup required') {
                console.error('❌ Error loading config:', error);
            }
            configLoaded = false;
            CONFIG = {
                businessName: "Hallmarking Services",
                defaultRatePerItem: 10,
                currency: "₹"
            };
            updateBusinessName();
            return CONFIG;
        } finally {
            configPromise = null;
        }
    })();
    
    return configPromise;
}

function updateBusinessName() {
    const navBusinessName = document.getElementById('navBusinessName');
    if (navBusinessName) {
        const businessName = CONFIG.businessName || "Hallmarking Services";
        navBusinessName.textContent = businessName;
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                const elem = document.getElementById('navBusinessName');
                if (elem && CONFIG.businessName) {
                    elem.textContent = CONFIG.businessName;
                }
            });
        }
    }
}

function changeWebAppUrl() {
    const currentUrl = localStorage.getItem('webAppUrl');
    const newUrl = prompt('Enter new Web App URL:', currentUrl);
    
    if (newUrl && newUrl.trim()) {
        localStorage.setItem('webAppUrl', newUrl.trim());
        alert('✅ URL updated successfully!\n\nRefreshing page...');
        location.reload();
        return true;
    }
    return false;
}

loadConfig();
