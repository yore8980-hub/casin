const fs = require('fs');
const litecore = require('litecore-lib');
const litecoinDirect = require('./utils/litecoinDirect.js');

// Configuration pour connexion directe (pas d'API key nécessaire)
const NETWORK = 'ltc'; // Litecoin mainnet

// File to store generated addresses
const ADDRESSES_FILE = 'addresses.json';

/**
 * Load saved addresses from JSON file
 * @returns {Array} List of addresses with their private keys
 */
function loadAddresses() {
    try {
        if (fs.existsSync(ADDRESSES_FILE)) {
            const data = fs.readFileSync(ADDRESSES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading addresses:', error.message);
    }
    return [];
}

/**
 * Save addresses to JSON file
 * @param {Array} addresses - List of addresses to save
 */
function saveAddresses(addresses) {
    try {
        fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
        console.log(`✅ Addresses saved to ${ADDRESSES_FILE}`);
    } catch (error) {
        console.error('Error saving addresses:', error.message);
    }
}

/**
 * Generate a new Litecoin address with its private key
 * This function uses litecore-lib to create a private key/public address pair
 * Perfect for later integration into a Discord bot with games like blackjack/roulette
 * @returns {Object} Object containing the address and private key
 */
function generateAddress() {
    try {
        // Generate a new random private key
        const privateKey = new litecore.PrivateKey();
        
        // Create the corresponding public address
        const address = privateKey.toAddress();
        
        const newAddress = {
            address: address.toString(),
            privateKey: privateKey.toString(),
            createdAt: new Date().toISOString(),
            balance: 0 // Will be updated during checks
        };
        
        // Load existing addresses
        const addresses = loadAddresses();
        
        // Add the new address
        addresses.push(newAddress);
        
        // Save
        saveAddresses(addresses);
        
        console.log(`🔑 New address generated: ${newAddress.address}`);
        return newAddress;
        
    } catch (error) {
        console.error('Error generating address:', error.message);
        return null;
    }
}

/**
 * Vérifie le solde d'une adresse via connexion directe (sans API key)
 * @param {string} address - L'adresse Litecoin à vérifier
 * @returns {Promise<number>} Le solde en LTC
 */
async function getAddressBalance(address) {
    try {
        return await litecoinDirect.getAddressBalance(address, false); // false = mainnet
    } catch (error) {
        console.error(`❌ Erreur vérification pour ${address.substring(0, 10)}...:`, error.message);
        return 0;
    }
}

/**
 * Vérifie automatiquement les dépôts sur toutes les adresses
 * Cette fonction peut être appelée périodiquement pour détecter les nouveaux dépôts
 * Idéal pour un bot casino qui doit créditer automatiquement les joueurs
 */
async function checkDeposits() {
    const addresses = loadAddresses();
    
    if (addresses.length === 0) {
        console.log('ℹ️  Aucune adresse à vérifier');
        return;
    }
    
    console.log(`🔍 Vérification de ${addresses.length} adresse(s)...`);
    
    for (let i = 0; i < addresses.length; i++) {
        const addressData = addresses[i];
        console.log(`🔍 Vérification ${i + 1}/${addresses.length}: ${addressData.address.substring(0, 10)}...`);
        
        const currentBalance = await getAddressBalance(addressData.address);
        
        // Check if there was a new deposit
        if (currentBalance > addressData.balance) {
            const deposit = currentBalance - addressData.balance;
            console.log(`💰 Deposit detected: ${deposit} LTC on address ${addressData.address}`);
            
            // Update balance
            addresses[i].balance = currentBalance;
            addresses[i].lastChecked = new Date().toISOString();
        } else if (currentBalance === addressData.balance) {
            console.log(`ℹ️  Aucun nouveau dépôt pour ${addressData.address.substring(0, 10)}...`);
        }
        
        // Délai de 5 secondes pour être respectueux envers les explorateurs publics
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Sauvegarde des soldes mis à jour
    saveAddresses(addresses);
}

/**
 * Obtient les UTXOs (unspent outputs) d'une adresse via connexion directe
 * Nécessaire pour construire des transactions de retrait
 * @param {string} address - L'adresse Litecoin
 * @returns {Promise<Array>} Liste des UTXOs
 */
async function getAddressUTXOs(address) {
    try {
        return await litecoinDirect.getAddressUTXOs(address, false); // false = mainnet
    } catch (error) {
        console.error('Erreur UTXO:', error.message);
        return [];
    }
}

/**
 * Diffuse une transaction sur le réseau Litecoin via connexion directe
 * @param {string} txHex - Transaction sérialisée en hexadécimal
 * @returns {Promise<string|null>} L'ID de la transaction ou null en cas d'erreur
 */
async function broadcastTransaction(txHex) {
    try {
        return await litecoinDirect.broadcastTransaction(txHex, false); // false = mainnet
    } catch (error) {
        console.error('Erreur de diffusion:', error.message);
        return null;
    }
}

/**
 * Effectue un retrait depuis une adresse vers une destination
 * Fonction principale pour les retraits du casino - peut être intégrée facilement
 * dans un bot Discord pour permettre aux joueurs de retirer leurs gains
 * @param {string} fromAddress - Adresse source (doit être dans notre fichier)
 * @param {string} toAddress - Adresse de destination
 * @param {number} amount - Montant en LTC à envoyer
 * @param {number} feeRate - Frais en satoshis par byte (défaut: 1000 sat/kb = 1 sat/byte)
 * @returns {Promise<string|null>} L'ID de la transaction ou null en cas d'erreur
 */
async function withdraw(fromAddress, toAddress, amount, feeRate = 1) {
    try {
        // Recherche de la clé privée correspondante
        const addresses = loadAddresses();
        const addressData = addresses.find(addr => addr.address === fromAddress);
        
        if (!addressData) {
            console.error(`❌ Adresse ${fromAddress} non trouvée dans notre portefeuille`);
            return null;
        }
        
        console.log(`🏦 Préparation du retrait de ${amount} LTC depuis ${fromAddress} vers ${toAddress}`);
        
        // Récupération des UTXOs
        const utxos = await getAddressUTXOs(fromAddress);
        if (utxos.length === 0) {
            console.error('❌ Aucun UTXO disponible pour cette adresse');
            return null;
        }
        
        // Conversion du montant en satoshis
        const amountSatoshis = Math.round(amount * 100000000);
        
        // Création de la transaction
        const transaction = new litecore.Transaction();
        
        // Ajout des inputs (UTXOs) avec script P2PKH standard
        let totalInputs = 0;
        for (const utxo of utxos) {
            // Génération du script P2PKH standard pour l'adresse
            const address = litecore.Address.fromString(fromAddress);
            const script = litecore.Script.buildPublicKeyHashOut(address);
            
            transaction.from({
                txId: utxo.txid,
                outputIndex: utxo.outputIndex,
                address: fromAddress,
                script: script.toHex(),
                satoshis: utxo.satoshis
            });
            totalInputs += utxo.satoshis;
        }
        
        // Estimation des frais (taille approximative * fee rate)
        const estimatedSize = 180 + (utxos.length * 180); // Estimation basique
        const fees = estimatedSize * feeRate;
        
        // Vérification que nous avons assez de fonds
        if (totalInputs < amountSatoshis + fees) {
            console.error(`❌ Fonds insuffisants. Disponible: ${totalInputs/100000000} LTC, Requis: ${(amountSatoshis + fees)/100000000} LTC`);
            return null;
        }
        
        // Ajout de l'output principal (destination)
        transaction.to(toAddress, amountSatoshis);
        
        // Calcul et ajout du change (monnaie rendue)
        const change = totalInputs - amountSatoshis - fees;
        if (change > 5460) { // Dust limit pour Litecoin
            transaction.to(fromAddress, change);
        }
        
        // Signature de la transaction avec la clé privée
        const privateKey = new litecore.PrivateKey(addressData.privateKey);
        transaction.sign(privateKey);
        
        // Sérialisation de la transaction
        const txHex = transaction.serialize();
        console.log(`📤 Transaction créée (${txHex.length/2} bytes): ${txHex.substring(0, 64)}...`);
        
        // Diffusion sur le réseau
        const txid = await broadcastTransaction(txHex);
        
        if (txid) {
            // Mise à jour du solde local (approximatif)
            const addressIndex = addresses.findIndex(addr => addr.address === fromAddress);
            if (addressIndex !== -1) {
                addresses[addressIndex].balance -= amount;
                addresses[addressIndex].lastWithdrawal = {
                    amount: amount,
                    to: toAddress,
                    txid: txid,
                    timestamp: new Date().toISOString()
                };
                saveAddresses(addresses);
            }
        }
        
        return txid;
        
    } catch (error) {
        console.error('❌ Erreur lors du retrait:', error.message);
        return null;
    }
}

/**
 * Affiche le statut de toutes les adresses
 */
function showWalletStatus() {
    const addresses = loadAddresses();
    
    if (addresses.length === 0) {
        console.log('💼 Portefeuille vide - aucune adresse générée');
        return;
    }
    
    console.log('\n💼 === STATUT DU PORTEFEUILLE ===');
    let totalBalance = 0;
    
    addresses.forEach((addr, index) => {
        console.log(`\n${index + 1}. Adresse: ${addr.address}`);
        console.log(`   Solde: ${addr.balance} LTC`);
        console.log(`   Créée: ${new Date(addr.createdAt).toLocaleString()}`);
        if (addr.lastChecked) {
            console.log(`   Dernière vérif: ${new Date(addr.lastChecked).toLocaleString()}`);
        }
        totalBalance += addr.balance;
    });
    
    console.log(`\n💰 SOLDE TOTAL: ${totalBalance} LTC`);
    console.log('===================================\n');
}

/**
 * Smart deposit monitoring - only check active deposit requests
 * Called by Discord bot when needed
 */
async function smartDepositCheck(activeAddresses = []) {
    if (activeAddresses.length === 0) {
        console.log('ℹ️  No active deposit requests to monitor');
        return [];
    }
    
    console.log(`🔍 Smart monitoring ${activeAddresses.length} active deposit(s)...`);
    const detectedDeposits = [];
    
    for (const addressData of activeAddresses) {
        const currentBalance = await getAddressBalance(addressData.address);
        
        // Check if there was a new deposit
        if (currentBalance > addressData.lastKnownBalance) {
            const depositAmount = currentBalance - addressData.lastKnownBalance;
            
            detectedDeposits.push({
                address: addressData.address,
                amount: depositAmount,
                newBalance: currentBalance,
                userId: addressData.userId
            });
            
            console.log(`💰 Deposit detected: ${depositAmount} LTC on address ${addressData.address}`);
        }
        
        // Small delay to avoid API overload
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return detectedDeposits;
}

/**
 * Initialize wallet system (no automatic monitoring)
 */
function initializeWallet() {
    console.log('🎰 === LITECOIN CASINO WALLET SYSTEM ===');
    console.log('✅ Wallet system initialized - Smart monitoring mode');
    console.log('📋 AVAILABLE FUNCTIONS:');
    console.log('- generateAddress(): Create new address');
    console.log('- smartDepositCheck(): Check active deposits only');
    console.log('- withdraw(from, to, amount): Process withdrawal');
    console.log('- showWalletStatus(): Display wallet status');
}

// Point d'entrée - initialise le système
if (require.main === module) {
    initializeWallet();
}

// Export des fonctions pour utilisation externe (bot Discord, etc.)
module.exports = {
    generateAddress,
    checkDeposits,
    smartDepositCheck,
    withdraw,
    showWalletStatus,
    loadAddresses,
    getAddressBalance,
    initializeWallet
};