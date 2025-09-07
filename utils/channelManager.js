const fs = require('fs');
const path = require('path');

const CHANNEL_COUNTER_FILE = path.join(__dirname, '../data/channel_counter.json');

class ChannelManager {
    constructor() {
        this.channelData = this.loadChannelData();
    }

    loadChannelData() {
        try {
            if (fs.existsSync(CHANNEL_COUNTER_FILE)) {
                return JSON.parse(fs.readFileSync(CHANNEL_COUNTER_FILE, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading channel data:', error);
        }
        
        return {
            balanceCounter: 0,
            activeChannels: {},
            channelHistory: []
        };
    }

    saveChannelData() {
        try {
            fs.writeFileSync(CHANNEL_COUNTER_FILE, JSON.stringify(this.channelData, null, 2));
            console.log('✅ Channel data saved');
        } catch (error) {
            console.error('Error saving channel data:', error);
        }
    }

    getNextBalanceChannelName() {
        this.channelData.balanceCounter++;
        this.saveChannelData();
        
        const number = this.channelData.balanceCounter.toString().padStart(3, '0');
        return `deposit-${number}`;
    }

    registerChannel(channelId, userId, type = 'balance') {
        this.channelData.activeChannels[channelId] = {
            userId: userId,
            type: type,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        this.channelData.channelHistory.push({
            channelId: channelId,
            userId: userId,
            type: type,
            createdAt: Date.now()
        });
        
        this.saveChannelData();
        console.log(`📝 Channel ${channelId} registered for user ${userId}`);
    }

    unregisterChannel(channelId) {
        if (this.channelData.activeChannels[channelId]) {
            delete this.channelData.activeChannels[channelId];
            this.saveChannelData();
            console.log(`🗑️ Channel ${channelId} unregistered`);
        }
    }

    getChannelInfo(channelId) {
        return this.channelData.activeChannels[channelId] || null;
    }

    getUserActiveChannels(userId) {
        return Object.entries(this.channelData.activeChannels)
            .filter(([channelId, data]) => data.userId === userId)
            .map(([channelId, data]) => ({ channelId, ...data }));
    }

    getStats() {
        return {
            totalCreated: this.channelData.balanceCounter,
            currentActive: Object.keys(this.channelData.activeChannels).length,
            totalHistory: this.channelData.channelHistory.length
        };
    }
}

module.exports = new ChannelManager();