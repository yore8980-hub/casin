const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECURITY_FILE = path.join(__dirname, '../data/user_security.json');
const ACTIVE_DEPOSITS_FILE = path.join(__dirname, '../data/active_deposits.json');
const GAMBLING_SESSIONS_FILE = path.join(__dirname, '../data/gambling_sessions.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load user security data
 * @returns {Object} Security data
 */
function loadSecurityData() {
    try {
        if (fs.existsSync(SECURITY_FILE)) {
            const data = fs.readFileSync(SECURITY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading security data:', error.message);
    }
    return {};
}

/**
 * Save user security data
 * @param {Object} data - Security data to save
 */
function saveSecurityData(data) {
    try {
        fs.writeFileSync(SECURITY_FILE, JSON.stringify(data, null, 2));
        console.log('✅ Security data saved');
    } catch (error) {
        console.error('Error saving security data:', error.message);
    }
}

/**
 * Load active deposits
 * @returns {Object} Active deposits data
 */
function loadActiveDeposits() {
    try {
        if (fs.existsSync(ACTIVE_DEPOSITS_FILE)) {
            const data = fs.readFileSync(ACTIVE_DEPOSITS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading active deposits:', error.message);
    }
    return {};
}

/**
 * Save active deposits
 * @param {Object} data - Active deposits data to save
 */
function saveActiveDeposits(data) {
    try {
        fs.writeFileSync(ACTIVE_DEPOSITS_FILE, JSON.stringify(data, null, 2));
        console.log('✅ Active deposits saved');
    } catch (error) {
        console.error('Error saving active deposits:', error.message);
    }
}

/**
 * Load gambling sessions
 * @returns {Object} Gambling sessions data
 */
function loadGamblingSessions() {
    try {
        if (fs.existsSync(GAMBLING_SESSIONS_FILE)) {
            const data = fs.readFileSync(GAMBLING_SESSIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading gambling sessions:', error.message);
    }
    return {};
}

/**
 * Save gambling sessions
 * @param {Object} data - Gambling sessions data to save
 */
function saveGamblingSessions(data) {
    try {
        fs.writeFileSync(GAMBLING_SESSIONS_FILE, JSON.stringify(data, null, 2));
        console.log('✅ Gambling sessions saved');
    } catch (error) {
        console.error('Error saving gambling sessions:', error.message);
    }
}

/**
 * Generate secure recovery key
 * @returns {string} Recovery key
 */
function generateRecoveryKey() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
}

/**
 * Hash password securely
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Stored hashed password
 * @returns {boolean} True if password matches
 */
function verifyPassword(password, hashedPassword) {
    try {
        const [salt, hash] = hashedPassword.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    } catch (error) {
        return false;
    }
}

/**
 * Get or create user security profile
 * @param {string} userId - Discord user ID
 * @returns {Object} Security profile
 */
function getUserSecurity(userId) {
    const security = loadSecurityData();
    
    if (!security[userId]) {
        security[userId] = {
            userId: userId,
            hasPassword: false,
            passwordHash: null,
            recoveryKey: null,
            depositRequests: [],
            lastGamblingSession: null,
            wageredAmount: 0,
            depositedAmount: 0,
            canCashout: true,
            createdAt: new Date().toISOString()
        };
        saveSecurityData(security);
    }
    
    return security[userId];
}

/**
 * Set user password and generate recovery key
 * @param {string} userId - Discord user ID
 * @param {string} password - New password
 * @returns {string} Recovery key
 */
function setUserPassword(userId, password) {
    const security = loadSecurityData();
    const userSec = getUserSecurity(userId);
    
    const recoveryKey = generateRecoveryKey();
    
    userSec.hasPassword = true;
    userSec.passwordHash = hashPassword(password);
    userSec.recoveryKey = recoveryKey;
    
    security[userId] = userSec;
    saveSecurityData(security);
    
    return recoveryKey;
}

/**
 * Change user password
 * @param {string} userId - Discord user ID
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} Success
 */
function changeUserPassword(userId, oldPassword, newPassword) {
    const security = loadSecurityData();
    const userSec = getUserSecurity(userId);
    
    if (!userSec.hasPassword || !verifyPassword(oldPassword, userSec.passwordHash)) {
        return false;
    }
    
    userSec.passwordHash = hashPassword(newPassword);
    security[userId] = userSec;
    saveSecurityData(security);
    
    return true;
}

/**
 * Verify user password
 * @param {string} userId - Discord user ID
 * @param {string} password - Password to verify
 * @returns {boolean} True if password is correct
 */
function verifyUserPassword(userId, password) {
    const userSec = getUserSecurity(userId);
    
    if (!userSec.hasPassword) {
        return false;
    }
    
    return verifyPassword(password, userSec.passwordHash);
}

/**
 * Reset recovery key with old key + password
 * @param {string} userId - Discord user ID
 * @param {string} oldRecoveryKey - Old recovery key
 * @param {string} password - Current password
 * @returns {string|null} New recovery key or null if failed
 */
function resetRecoveryKey(userId, oldRecoveryKey, password) {
    const security = loadSecurityData();
    const userSec = getUserSecurity(userId);
    
    if (!userSec.hasPassword || 
        userSec.recoveryKey !== oldRecoveryKey.toUpperCase() ||
        !verifyPassword(password, userSec.passwordHash)) {
        return null;
    }
    
    const newRecoveryKey = generateRecoveryKey();
    userSec.recoveryKey = newRecoveryKey;
    
    security[userId] = userSec;
    saveSecurityData(security);
    
    return newRecoveryKey;
}

/**
 * Reset user password and recovery key (Admin function)
 * @param {string} userId - Discord user ID  
 * @param {string} newRecoveryKey - New recovery key to set
 * @returns {Object} Result with success status
 */
function resetPassword(userId, newRecoveryKey) {
    try {
        const security = loadSecurityData();
        const userSec = getUserSecurity(userId);
        
        // Reset password to null (user will need to set new one)
        userSec.hasPassword = false;
        userSec.passwordHash = null;
        userSec.recoveryKey = newRecoveryKey;
        
        security[userId] = userSec;
        saveSecurityData(security);
        
        console.log(`🔐 Admin reset password for user ${userId}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error resetting password:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add active deposit request
 * @param {string} userId - Discord user ID
 * @param {string} address - LTC address
 * @param {number} initialBalance - Initial balance of address
 */
function addActiveDeposit(userId, address, initialBalance = 0) {
    const activeDeposits = loadActiveDeposits();
    
    if (!activeDeposits[userId]) {
        activeDeposits[userId] = [];
    }
    
    activeDeposits[userId].push({
        address: address,
        userId: userId,
        lastKnownBalance: initialBalance,
        createdAt: new Date().toISOString(),
        active: true
    });
    
    saveActiveDeposits(activeDeposits);
}

/**
 * Get active deposits for user
 * @param {string} userId - Discord user ID
 * @returns {Array} Active deposit requests
 */
function getActiveDeposits(userId) {
    const activeDeposits = loadActiveDeposits();
    return activeDeposits[userId] || [];
}

/**
 * Get all active deposits across all users
 * @returns {Array} All active deposit requests
 */
function getAllActiveDeposits() {
    const activeDeposits = loadActiveDeposits();
    const allDeposits = [];
    
    for (const userId in activeDeposits) {
        allDeposits.push(...activeDeposits[userId].filter(deposit => deposit.active));
    }
    
    return allDeposits;
}

/**
 * Complete deposit request
 * @param {string} userId - Discord user ID
 * @param {string} address - LTC address
 */
function completeDepositRequest(userId, address) {
    const activeDeposits = loadActiveDeposits();
    
    if (activeDeposits[userId]) {
        const deposit = activeDeposits[userId].find(d => d.address === address);
        if (deposit) {
            deposit.active = false;
            deposit.completedAt = new Date().toISOString();
        }
    }
    
    saveActiveDeposits(activeDeposits);
}

/**
 * Start gambling session
 * @param {string} userId - Discord user ID
 * @param {number} minutes - Session duration in minutes
 * @returns {Date} Session end time
 */
function startGamblingSession(userId, minutes) {
    const sessions = loadGamblingSessions();
    const endTime = new Date(Date.now() + minutes * 60 * 1000);
    
    sessions[userId] = {
        userId: userId,
        startTime: new Date().toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: minutes,
        active: true
    };
    
    saveGamblingSessions(sessions);
    
    // Update user security
    const security = loadSecurityData();
    const userSec = getUserSecurity(userId);
    userSec.lastGamblingSession = sessions[userId];
    security[userId] = userSec;
    saveSecurityData(security);
    
    return endTime;
}

/**
 * Check if user has active gambling session
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if session is active
 */
function hasActiveGamblingSession(userId) {
    const sessions = loadGamblingSessions();
    
    if (!sessions[userId] || !sessions[userId].active) {
        return false;
    }
    
    const now = new Date();
    const endTime = new Date(sessions[userId].endTime);
    
    if (now > endTime) {
        // Session expired
        sessions[userId].active = false;
        saveGamblingSessions(sessions);
        return false;
    }
    
    return true;
}

/**
 * Add wagered amount for user
 * @param {string} userId - Discord user ID
 * @param {number} amount - Amount wagered
 */
function addWageredAmount(userId, amount) {
    const security = loadSecurityData();
    const userSec = getUserSecurity(userId);
    
    userSec.wageredAmount += amount;
    security[userId] = userSec;
    saveSecurityData(security);
}

/**
 * Add deposited amount for user
 * @param {string} userId - Discord user ID
 * @param {number} amount - Amount deposited
 */
function addDepositedAmount(userId, amount) {
    const security = loadSecurityData();
    const userSec = getUserSecurity(userId);
    
    userSec.depositedAmount += amount;
    // Check if user can cashout (wagered >= deposited)
    userSec.canCashout = userSec.wageredAmount >= userSec.depositedAmount;
    
    security[userId] = userSec;
    saveSecurityData(security);
}

/**
 * Clear all active deposits (Admin function)
 * @returns {boolean} Success status
 */
function clearAllActiveDeposits() {
    try {
        const emptyDeposits = {};
        saveActiveDeposits(emptyDeposits);
        console.log('🗯️ All active deposits cleared');
        return true;
    } catch (error) {
        console.error('Error clearing active deposits:', error);
        return false;
    }
}

/**
 * Check if user can cashout
 * @param {string} userId - Discord user ID
 * @returns {Object} Cashout status and info
 */
function canUserCashout(userId) {
    const userSec = getUserSecurity(userId);
    
    const wageredPercent = userSec.depositedAmount > 0 ? 
        (userSec.wageredAmount / userSec.depositedAmount) * 100 : 100;
    
    return {
        canCashout: userSec.canCashout,
        wageredAmount: userSec.wageredAmount,
        depositedAmount: userSec.depositedAmount,
        wageredPercent: wageredPercent,
        remainingToWager: Math.max(0, userSec.depositedAmount - userSec.wageredAmount)
    };
}

module.exports = {
    getUserSecurity,
    setUserPassword,
    changeUserPassword,
    verifyUserPassword,
    resetRecoveryKey,
    resetPassword,
    addActiveDeposit,
    getActiveDeposits,
    getAllActiveDeposits,
    completeDepositRequest,
    clearAllActiveDeposits,
    startGamblingSession,
    hasActiveGamblingSession,
    addWageredAmount,
    addDepositedAmount,
    canUserCashout,
    generateRecoveryKey
};