const fs = require('fs');
const path = require('path');
const ltcWallet = require('../litecoin-casino-bot.js');

const TREASURY_FILE = path.join(__dirname, '../data/treasury.json');
const TREASURY_ADDRESS = 'LTC_TREASURY_ADDRESS_PLACEHOLDER'; // This should be a real LTC address

class TreasuryManager {
    constructor() {
        this.treasuryData = this.loadTreasuryData();
    }

    loadTreasuryData() {
        try {
            if (fs.existsSync(TREASURY_FILE)) {
                return JSON.parse(fs.readFileSync(TREASURY_FILE, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading treasury data:', error);
        }
        
        return {
            address: TREASURY_ADDRESS,
            totalCollected: 0,
            totalPaidOut: 0,
            currentBalance: 0,
            transactions: [],
            lastUpdated: Date.now()
        };
    }

    saveTreasuryData() {
        try {
            fs.writeFileSync(TREASURY_FILE, JSON.stringify(this.treasuryData, null, 2));
            console.log('✅ Treasury data saved');
        } catch (error) {
            console.error('Error saving treasury data:', error);
        }
    }

    /**
     * Get current treasury balance (estimated)
     * This should ideally query the blockchain for the real balance
     */
    getCurrentBalance() {
        return this.treasuryData.currentBalance;
    }

    /**
     * Calculate maximum bet allowed (30% of treasury balance)
     */
    getMaxBetLimit() {
        const balance = this.getCurrentBalance();
        return balance * 0.30; // 30% limit
    }

    /**
     * Record a house win (money collected from players)
     */
    recordHouseWin(amount, userId, gameType, details = {}) {
        const transaction = {
            type: 'house_win',
            amount: amount,
            userId: userId,
            gameType: gameType,
            details: details,
            timestamp: Date.now(),
            id: `win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.treasuryData.transactions.push(transaction);
        this.treasuryData.totalCollected += amount;
        this.treasuryData.currentBalance += amount;
        this.treasuryData.lastUpdated = Date.now();

        this.saveTreasuryData();

        console.log(`🏠 House win recorded: ${amount.toFixed(8)} LTC from ${userId} in ${gameType}`);
        return transaction;
    }

    /**
     * Record a payout to a winner
     */
    recordPayout(amount, userId, gameType, details = {}) {
        const transaction = {
            type: 'payout',
            amount: amount,
            userId: userId,
            gameType: gameType,
            details: details,
            timestamp: Date.now(),
            id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.treasuryData.transactions.push(transaction);
        this.treasuryData.totalPaidOut += amount;
        this.treasuryData.currentBalance -= amount;
        this.treasuryData.lastUpdated = Date.now();

        this.saveTreasuryData();

        console.log(`💰 Payout recorded: ${amount.toFixed(8)} LTC to ${userId} from ${gameType}`);
        return transaction;
    }

    /**
     * Check if a bet amount is within limits
     */
    isBetAllowed(betAmount) {
        const maxBet = this.getMaxBetLimit();
        return betAmount <= maxBet;
    }

    /**
     * Get treasury statistics
     */
    getStats() {
        return {
            address: this.treasuryData.address,
            currentBalance: this.treasuryData.currentBalance,
            totalCollected: this.treasuryData.totalCollected,
            totalPaidOut: this.treasuryData.totalPaidOut,
            netProfit: this.treasuryData.totalCollected - this.treasuryData.totalPaidOut,
            maxBetLimit: this.getMaxBetLimit(),
            transactionCount: this.treasuryData.transactions.length,
            lastUpdated: this.treasuryData.lastUpdated
        };
    }

    /**
     * Get recent transactions
     */
    getRecentTransactions(limit = 10) {
        return this.treasuryData.transactions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Manual balance adjustment (owner only)
     */
    adjustBalance(amount, reason, adminUserId) {
        const transaction = {
            type: 'manual_adjustment',
            amount: amount,
            reason: reason,
            adminUserId: adminUserId,
            timestamp: Date.now(),
            id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.treasuryData.transactions.push(transaction);
        this.treasuryData.currentBalance += amount;
        this.treasuryData.lastUpdated = Date.now();

        this.saveTreasuryData();

        console.log(`⚖️ Manual balance adjustment: ${amount.toFixed(8)} LTC by ${adminUserId} - ${reason}`);
        return transaction;
    }
}

module.exports = new TreasuryManager();