const fs = require('fs');
const path = require('path');

const PROFILES_FILE = path.join(__dirname, '../data/user_profiles.json');
const ADDRESS_MAPPING_FILE = path.join(__dirname, '../data/address_mapping.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load user profiles from JSON file
 * @returns {Object} User profiles object
 */
function loadProfiles() {
    try {
        if (fs.existsSync(PROFILES_FILE)) {
            const data = fs.readFileSync(PROFILES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading user profiles:', error.message);
    }
    return {};
}

/**
 * Save user profiles to JSON file
 * @param {Object} profiles - User profiles to save
 */
function saveProfiles(profiles) {
    try {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
        console.log('✅ User profiles saved');
    } catch (error) {
        console.error('Error saving user profiles:', error.message);
    }
}

/**
 * Load address mapping from JSON file
 * @returns {Object} Address mapping object
 */
function loadAddressMapping() {
    try {
        if (fs.existsSync(ADDRESS_MAPPING_FILE)) {
            const data = fs.readFileSync(ADDRESS_MAPPING_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading address mapping:', error.message);
    }
    return {};
}

/**
 * Save address mapping to JSON file
 * @param {Object} mapping - Address mapping to save
 */
function saveAddressMapping(mapping) {
    try {
        fs.writeFileSync(ADDRESS_MAPPING_FILE, JSON.stringify(mapping, null, 2));
        console.log('✅ Address mapping saved');
    } catch (error) {
        console.error('Error saving address mapping:', error.message);
    }
}

/**
 * Get or create user profile
 * @param {string} userId - Discord user ID
 * @returns {Object} User profile
 */
function getUserProfile(userId) {
    const profiles = loadProfiles();
    
    if (!profiles[userId]) {
        profiles[userId] = {
            userId: userId,
            balance: 0,
            totalDeposited: 0,
            totalWithdrawn: 0,
            depositHistory: [],
            withdrawalHistory: [],
            gameHistory: [],
            addresses: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        saveProfiles(profiles);
    }
    
    return profiles[userId];
}

/**
 * Update user profile
 * @param {string} userId - Discord user ID
 * @param {Object} updates - Updates to apply to profile
 */
function updateUserProfile(userId, updates) {
    const profiles = loadProfiles();
    
    if (!profiles[userId]) {
        profiles[userId] = getUserProfile(userId);
    }
    
    // Merge updates
    profiles[userId] = { ...profiles[userId], ...updates };
    profiles[userId].lastActivity = new Date().toISOString();
    
    saveProfiles(profiles);
    return profiles[userId];
}

/**
 * Add deposit to user profile
 * @param {string} userId - Discord user ID
 * @param {number} amount - Deposit amount in LTC
 * @param {string} address - Deposit address
 * @param {string} txid - Transaction ID
 */
function addDeposit(userId, amount, address, txid = null) {
    const profile = getUserProfile(userId);
    
    const deposit = {
        amount: amount,
        address: address,
        txid: txid,
        timestamp: new Date().toISOString(),
        confirmed: txid !== null
    };
    
    profile.depositHistory.push(deposit);
    profile.balance += amount;
    profile.totalDeposited += amount;
    
    updateUserProfile(userId, profile);
    
    console.log(`💰 Added deposit: ${amount} LTC for user ${userId}`);
    return deposit;
}

/**
 * Add withdrawal to user profile
 * @param {string} userId - Discord user ID
 * @param {number} amount - Withdrawal amount in LTC
 * @param {string} toAddress - Destination address
 * @param {string} txid - Transaction ID
 */
function addWithdrawal(userId, amount, toAddress, txid) {
    const profile = getUserProfile(userId);
    
    if (profile.balance < amount) {
        throw new Error('Insufficient balance');
    }
    
    const withdrawal = {
        amount: amount,
        toAddress: toAddress,
        txid: txid,
        timestamp: new Date().toISOString()
    };
    
    profile.withdrawalHistory.push(withdrawal);
    profile.balance -= amount;
    profile.totalWithdrawn += amount;
    
    updateUserProfile(userId, profile);
    
    console.log(`💸 Added withdrawal: ${amount} LTC for user ${userId}`);
    return withdrawal;
}

/**
 * Transfer balance between users
 * @param {string} fromUserId - Sender user ID
 * @param {string} toUserId - Receiver user ID
 * @param {number} amount - Amount to transfer
 */
function transferBalance(fromUserId, toUserId, amount) {
    const fromProfile = getUserProfile(fromUserId);
    const toProfile = getUserProfile(toUserId);
    
    if (fromProfile.balance < amount) {
        throw new Error('Insufficient balance');
    }
    
    fromProfile.balance -= amount;
    toProfile.balance += amount;
    
    const transfer = {
        amount: amount,
        from: fromUserId,
        to: toUserId,
        timestamp: new Date().toISOString(),
        type: 'transfer'
    };
    
    // Add to both users' histories
    fromProfile.gameHistory.push({ ...transfer, action: 'sent' });
    toProfile.gameHistory.push({ ...transfer, action: 'received' });
    
    updateUserProfile(fromUserId, fromProfile);
    updateUserProfile(toUserId, toProfile);
    
    console.log(`🔄 Transfer: ${amount} LTC from ${fromUserId} to ${toUserId}`);
    return transfer;
}

/**
 * Link a Litecoin address to a Discord user
 * @param {string} userId - Discord user ID
 * @param {string} address - Litecoin address
 */
function linkAddressToUser(userId, address) {
    const mapping = loadAddressMapping();
    const profile = getUserProfile(userId);
    
    mapping[address] = userId;
    profile.addresses.push(address);
    
    saveAddressMapping(mapping);
    updateUserProfile(userId, profile);
    
    console.log(`🔗 Linked address ${address} to user ${userId}`);
}

/**
 * Get user ID from Litecoin address
 * @param {string} address - Litecoin address
 * @returns {string|null} Discord user ID or null if not found
 */
function getUserFromAddress(address) {
    const mapping = loadAddressMapping();
    return mapping[address] || null;
}

/**
 * Get all user profiles
 * @returns {Object} All user profiles
 */
function getAllProfiles() {
    return loadProfiles();
}

/**
 * Get leaderboard data
 * @param {string} type - 'balance', 'deposited', 'withdrawn'
 * @param {number} limit - Number of users to return
 * @returns {Array} Sorted user data
 */
function getLeaderboard(type = 'balance', limit = 10) {
    const profiles = loadProfiles();
    const users = Object.values(profiles);
    
    let sortKey;
    switch (type) {
        case 'deposited':
            sortKey = 'totalDeposited';
            break;
        case 'withdrawn':
            sortKey = 'totalWithdrawn';
            break;
        default:
            sortKey = 'balance';
    }
    
    return users
        .sort((a, b) => b[sortKey] - a[sortKey])
        .slice(0, limit)
        .map(user => ({
            userId: user.userId,
            value: user[sortKey],
            balance: user.balance
        }));
}

/**
 * Reset user security (password and recovery key) - Admin function
 * @param {string} userId - Discord user ID
 * @returns {Object} Result with success status and new recovery key
 */
function resetUserSecurity(userId) {
    try {
        const securityManager = require('./securityManager.js');
        const profiles = loadProfiles();
        
        if (!profiles[userId]) {
            return { success: false, error: 'User profile not found' };
        }
        
        // Generate new recovery key using securityManager
        const newRecoveryKey = securityManager.generateRecoveryKey();
        
        // Reset password to null (forces user to create new one)
        const resetResult = securityManager.resetPassword(userId, newRecoveryKey);
        
        if (resetResult.success) {
            console.log(`🔐 Admin reset security for user ${userId}`);
            
            return {
                success: true,
                newRecoveryKey: newRecoveryKey
            };
        } else {
            return { success: false, error: 'Security reset failed' };
        }
        
    } catch (error) {
        console.error('Error resetting user security:', error);
        return { success: false, error: 'Reset failed' };
    }
}

module.exports = {
    getUserProfile,
    updateUserProfile,
    addDeposit,
    addWithdrawal,
    transferBalance,
    linkAddressToUser,
    getUserFromAddress,
    getAllProfiles,
    getLeaderboard,
    loadProfiles,
    saveProfiles,
    resetUserSecurity
};