const ServiceConfig = {
    getScriptUrl() {
        const endpoint = 'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5Q1QzUzFZZTNOclN2LTR1dVBCNUhsRi15U2lranoyc1RMWXpfRDFEMUtBSFFDY3NrY1NTME02WEtTTkJXY3FpM28vZXhlYw==';
        return atob(endpoint);
    },

    getCustomEndpoint() {
        return localStorage.getItem('littleTreat_webAppUrl') || null;
    },

    getActiveEndpoint() {
        return this.getCustomEndpoint() || this.getScriptUrl();
    }
};

