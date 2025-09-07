/**
 * Utilities for formatting numbers and currencies
 */

/**
 * Format LTC amount to remove unnecessary trailing zeros
 * @param {number} amount - LTC amount
 * @returns {string} - Formatted LTC string
 */
function formatLTC(amount) {
    if (amount === 0) {
        return '0';
    }
    
    // Convert to fixed 8 decimal places first
    const fixed = amount.toFixed(8);
    
    // Remove trailing zeros and unnecessary decimal point
    const formatted = parseFloat(fixed).toString();
    
    // If the number is very small, show scientific notation
    if (amount < 0.00001 && amount > 0) {
        return amount.toExponential(3);
    }
    
    return formatted;
}

/**
 * Format USD amount with 2 decimal places
 * @param {number} amount - USD amount
 * @returns {string} - Formatted USD string
 */
function formatUSD(amount) {
    return amount.toFixed(2);
}

/**
 * Format percentage with 1 decimal place
 * @param {number} percentage - Percentage value
 * @returns {string} - Formatted percentage string
 */
function formatPercentage(percentage) {
    return percentage.toFixed(1);
}

module.exports = {
    formatLTC,
    formatUSD,
    formatPercentage
};