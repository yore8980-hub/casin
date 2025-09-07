/**
 * Litecoin Direct Connection - No API Keys Required
 * Uses public blockchain explorers and direct libraries
 */

const axios = require('axios');
const bitcoin = require('bitcoinjs-lib');

// Public Litecoin explorer APIs (no API key required)
const EXPLORERS = {
    mainnet: {
        base: 'https://litecoinspace.org/api',
        fallback: 'https://insight.litecore.io/api'
    },
    testnet: {
        base: 'https://litecoinspace.org/testnet/api',
        fallback: 'https://testnet.litecore.io/api'
    }
};

// Network configuration
const NETWORK = bitcoin.networks.bitcoin; // Litecoin uses Bitcoin network params

/**
 * Get address balance using public explorer
 * @param {string} address - Litecoin address
 * @param {boolean} testnet - Use testnet (default: false)
 * @returns {Promise<number>} Balance in LTC
 */
async function getAddressBalance(address, testnet = false) {
    const explorer = testnet ? EXPLORERS.testnet : EXPLORERS.mainnet;
    
    try {
        // Try primary explorer
        const response = await axios.get(`${explorer.base}/address/${address}`, {
            timeout: 10000
        });
        
        if (response.data && typeof response.data.chain_stats !== 'undefined') {
            // Litecoin Space format
            const confirmedBalance = response.data.chain_stats.funded_txo_sum || 0;
            const spentBalance = response.data.chain_stats.spent_txo_sum || 0;
            const balance = (confirmedBalance - spentBalance) / 100000000; // Convert satoshis to LTC
            
            if (balance > 0) {
                console.log(`✅ ${address.substring(0, 10)}...: ${balance} LTC`);
            }
            return balance;
        }
        
        return 0;
        
    } catch (error) {
        console.log(`⚠️ Erreur explorer principal pour ${address.substring(0, 10)}...: ${error.message}`);
        
        // Try fallback explorer
        try {
            const fallbackResponse = await axios.get(`${explorer.fallback}/addr/${address}`, {
                timeout: 10000
            });
            
            if (fallbackResponse.data && typeof fallbackResponse.data.balance !== 'undefined') {
                // Insight API format
                const balance = parseFloat(fallbackResponse.data.balance);
                
                if (balance > 0) {
                    console.log(`✅ ${address.substring(0, 10)}... (fallback): ${balance} LTC`);
                }
                return balance;
            }
            
        } catch (fallbackError) {
            console.log(`⚠️ Fallback également échoué pour ${address.substring(0, 10)}...: ${fallbackError.message}`);
        }
        
        return 0;
    }
}

/**
 * Get UTXO list for address
 * @param {string} address - Litecoin address
 * @param {boolean} testnet - Use testnet (default: false)
 * @returns {Promise<Array>} Array of UTXOs
 */
async function getAddressUTXOs(address, testnet = false) {
    const explorer = testnet ? EXPLORERS.testnet : EXPLORERS.mainnet;
    
    try {
        // Get UTXOs from Litecoin Space
        const response = await axios.get(`${explorer.base}/address/${address}/utxo`, {
            timeout: 10000
        });
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(utxo => ({
                txid: utxo.txid,
                outputIndex: utxo.vout,
                script: utxo.scriptpubkey || '',
                satoshis: utxo.value
            }));
        }
        
        return [];
        
    } catch (error) {
        console.error(`Erreur UTXO pour ${address}:`, error.message);
        return [];
    }
}

/**
 * Get transaction details
 * @param {string} txid - Transaction ID
 * @param {boolean} testnet - Use testnet (default: false)
 * @returns {Promise<Object|null>} Transaction details
 */
async function getTransaction(txid, testnet = false) {
    const explorer = testnet ? EXPLORERS.testnet : EXPLORERS.mainnet;
    
    try {
        const response = await axios.get(`${explorer.base}/tx/${txid}`, {
            timeout: 10000
        });
        
        return response.data;
        
    } catch (error) {
        console.error(`Erreur transaction ${txid}:`, error.message);
        return null;
    }
}

/**
 * Broadcast transaction to network
 * @param {string} txHex - Raw transaction hex
 * @param {boolean} testnet - Use testnet (default: false)
 * @returns {Promise<string|null>} Transaction ID if successful
 */
async function broadcastTransaction(txHex, testnet = false) {
    const explorer = testnet ? EXPLORERS.testnet : EXPLORERS.mainnet;
    
    try {
        const response = await axios.post(`${explorer.base}/tx`, txHex, {
            headers: { 'Content-Type': 'text/plain' },
            timeout: 15000
        });
        
        if (typeof response.data === 'string') {
            console.log(`✅ Transaction diffusée avec succès: ${response.data}`);
            return response.data; // Transaction ID
        }
        
        return null;
        
    } catch (error) {
        console.error('Erreur diffusion transaction:', error.message);
        return null;
    }
}

/**
 * Check for new transactions on an address
 * @param {string} address - Litecoin address
 * @param {number} lastCheckedTimestamp - Last check timestamp
 * @param {boolean} testnet - Use testnet (default: false)
 * @returns {Promise<Array>} Array of new transactions
 */
async function getNewTransactions(address, lastCheckedTimestamp, testnet = false) {
    const explorer = testnet ? EXPLORERS.testnet : EXPLORERS.mainnet;
    
    try {
        const response = await axios.get(`${explorer.base}/address/${address}/txs`, {
            timeout: 10000
        });
        
        if (response.data && Array.isArray(response.data)) {
            // Filter transactions newer than last check
            const newTxs = response.data.filter(tx => {
                const txTimestamp = tx.status?.block_time ? tx.status.block_time * 1000 : Date.now();
                return txTimestamp > lastCheckedTimestamp;
            });
            
            return newTxs;
        }
        
        return [];
        
    } catch (error) {
        console.error(`Erreur nouvelles transactions pour ${address}:`, error.message);
        return [];
    }
}

/**
 * Check multiple addresses efficiently
 * @param {Array<string>} addresses - Array of addresses to check
 * @param {boolean} testnet - Use testnet (default: false)
 * @returns {Promise<Object>} Object with address -> balance mapping
 */
async function checkMultipleAddresses(addresses, testnet = false) {
    const results = {};
    
    // Process addresses with delay to avoid rate limiting
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        
        try {
            results[address] = await getAddressBalance(address, testnet);
        } catch (error) {
            console.error(`Erreur pour ${address}:`, error.message);
            results[address] = 0;
        }
        
        // Small delay between requests to be respectful to public APIs
        if (i < addresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
    }
    
    return results;
}

/**
 * Health check for explorer APIs
 * @param {boolean} testnet - Use testnet (default: false)
 * @returns {Promise<boolean>} True if APIs are responsive
 */
async function healthCheck(testnet = false) {
    const explorer = testnet ? EXPLORERS.testnet : EXPLORERS.mainnet;
    
    try {
        // Test with a known address (Litecoin Foundation donation address)
        const testAddress = testnet ? 'mkYY3QRCJKJHZczVz6mJ6ztNKYZrn4s7hS' : 'LTC1QH7KYTQZ9ZXQX3Y8ZGX7ZXQX3Y8ZGX7ZXQX3Y8ZGX7Z';
        
        const response = await axios.get(`${explorer.base}/address/${testAddress}`, {
            timeout: 5000
        });
        
        return response.status === 200;
        
    } catch (error) {
        console.error('Health check failed:', error.message);
        return false;
    }
}

module.exports = {
    getAddressBalance,
    getAddressUTXOs,
    getTransaction,
    broadcastTransaction,
    getNewTransactions,
    checkMultipleAddresses,
    healthCheck,
    NETWORK
};