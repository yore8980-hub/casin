const axios = require('axios');

// Free currency conversion API (you can change this to your preferred service)
const API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

/**
 * Get exchange rate between two currencies
 * @param {string} from - Source currency (e.g., 'EUR')
 * @param {string} to - Target currency (e.g., 'USD')
 * @returns {Promise<number>} Exchange rate
 */
async function getExchangeRate(from, to) {
    try {
        const response = await axios.get(`${API_BASE_URL}/${from}`, {
            timeout: 5000
        });
        
        if (response.data && response.data.rates && response.data.rates[to]) {
            return response.data.rates[to];
        } else {
            throw new Error(`Exchange rate not found for ${from} to ${to}`);
        }
    } catch (error) {
        console.error('Currency API error:', error.message);
        throw new Error('Failed to fetch exchange rate. Please try again later.');
    }
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency
 * @param {string} to - Target currency
 * @returns {Promise<Object>} Conversion result
 */
async function convertCurrency(amount, from, to) {
    if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    
    const rate = await getExchangeRate(from, to);
    const convertedAmount = amount * rate;
    
    return {
        originalAmount: amount,
        convertedAmount: parseFloat(convertedAmount.toFixed(2)),
        fromCurrency: from.toUpperCase(),
        toCurrency: to.toUpperCase(),
        exchangeRate: rate,
        timestamp: new Date().toISOString()
    };
}

/**
 * Get multiple currency rates for display
 * @param {string} baseCurrency - Base currency (e.g., 'USD')
 * @returns {Promise<Object>} Multiple exchange rates
 */
async function getMultipleRates(baseCurrency = 'USD') {
    try {
        const response = await axios.get(`${API_BASE_URL}/${baseCurrency}`, {
            timeout: 5000
        });
        
        if (response.data && response.data.rates) {
            return {
                base: baseCurrency.toUpperCase(),
                rates: response.data.rates,
                lastUpdated: response.data.date || new Date().toISOString().split('T')[0]
            };
        } else {
            throw new Error('Failed to fetch exchange rates');
        }
    } catch (error) {
        console.error('Currency API error:', error.message);
        throw new Error('Failed to fetch exchange rates. Please try again later.');
    }
}

/**
 * Format currency amount for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency) {
    const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'BTC': '₿',
        'LTC': 'Ł'
    };
    
    const symbol = symbols[currency.toUpperCase()] || currency.toUpperCase();
    
    if (currency.toUpperCase() === 'JPY') {
        return `${symbol}${Math.round(amount).toLocaleString()}`;
    }
    
    return `${symbol}${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    })}`;
}

/**
 * Get current Litecoin price in specified currency
 * @param {string} currency - Target currency (default: USD)
 * @returns {Promise<Object>} LTC price data
 */
async function getLitecoinPrice(currency = 'USD') {
    try {
        // Using CoinGecko API for crypto prices (free tier)
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=${currency.toLowerCase()}`, {
            timeout: 5000
        });
        
        if (response.data && response.data.litecoin) {
            const price = response.data.litecoin[currency.toLowerCase()];
            return {
                price: price,
                currency: currency.toUpperCase(),
                symbol: 'LTC',
                timestamp: new Date().toISOString()
            };
        } else {
            throw new Error('Litecoin price not found');
        }
    } catch (error) {
        console.error('Crypto price API error:', error.message);
        throw new Error('Failed to fetch Litecoin price. Please try again later.');
    }
}

module.exports = {
    getExchangeRate,
    convertCurrency,
    getMultipleRates,
    formatCurrency,
    getLitecoinPrice
};