const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class LiveRoulette {
    constructor(client) {
        this.client = client;
        this.isRunning = false;
        this.currentBets = new Map(); // userId -> { bets: Map, totalBet: number }
        this.spinInterval = null;
        this.bettingPhase = true;
        this.timeLeft = 60;
        this.liveChannelId = null;
        this.currentMessage = null;
        
        // Roulette wheel configuration
        this.wheel = {
            0: 'green',
            1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
            11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
            21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
            31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
        };
    }

    start(channelId) {
        if (this.isRunning) return;
        
        this.liveChannelId = channelId;
        this.isRunning = true;
        this.bettingPhase = true;
        this.timeLeft = 60;
        
        console.log('🎰 Starting live roulette in channel:', channelId);
        this.runCycle();
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.spinInterval) {
            clearTimeout(this.spinInterval);
            this.spinInterval = null;
        }
        
        console.log('🛑 Live roulette stopped');
    }

    async runCycle() {
        if (!this.isRunning) return;
        
        try {
            // Betting phase (30 seconds)
            this.bettingPhase = true;
            this.timeLeft = 60;
            await this.updateDisplay();
            
            // Countdown
            const countdownInterval = setInterval(async () => {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    await this.endBettingAndSpin();
                } else {
                    await this.updateDisplay();
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Live roulette cycle error:', error);
            setTimeout(() => this.runCycle(), 5000); // Retry in 5 seconds
        }
    }

    async endBettingAndSpin() {
        this.bettingPhase = false;
        
        // Spin the wheel
        const result = Math.floor(Math.random() * 37);
        const color = this.wheel[result];
        
        // Show spinning animation
        await this.showSpinAnimation(result, color);
        
        // Process payouts
        await this.processPayouts(result, color);
        
        // Clear bets for next round
        this.currentBets.clear();
        
        // Start next cycle after 5 seconds
        setTimeout(() => this.runCycle(), 5000);
    }

    async showSpinAnimation(finalResult, finalColor) {
        const channel = this.client.channels.cache.get(this.liveChannelId);
        if (!channel) return;

        const spinEmbed = new EmbedBuilder()
            .setColor('#ff6b00')
            .setTitle('🎰 ROULETTE IS SPINNING!')
            .setDescription('The wheel is spinning... 🌪️')
            .addFields(
                { name: '⏳ Status', value: 'Spinning...', inline: true },
                { name: '🎯 Result', value: 'Coming soon...', inline: true }
            )
            .setTimestamp();

        if (this.currentMessage) {
            await this.currentMessage.edit({ embeds: [spinEmbed], components: [] });
        }

        // Animate for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Show result
        const colorEmoji = finalColor === 'red' ? '🔴' : finalColor === 'black' ? '⚫' : '🟢';
        const resultEmbed = new EmbedBuilder()
            .setColor(finalColor === 'red' ? '#ff0000' : finalColor === 'black' ? '#000000' : '#00ff00')
            .setTitle('🎯 ROULETTE RESULT!')
            .setDescription(`The ball landed on: **${finalResult}** ${colorEmoji}`)
            .addFields(
                { name: '🎲 Number', value: finalResult.toString(), inline: true },
                { name: '🎨 Color', value: finalColor.charAt(0).toUpperCase() + finalColor.slice(1), inline: true },
                { name: '🔄 Next Round', value: 'Starting in 5 seconds...', inline: true }
            )
            .setTimestamp();

        if (this.currentMessage) {
            await this.currentMessage.edit({ embeds: [resultEmbed], components: [] });
        }
    }

    async processPayouts(result, color) {
        const userProfiles = require('./userProfiles.js');
        const logManager = require('./logManager.js');
        
        for (const [userId, betData] of this.currentBets) {
            let totalWinnings = 0;
            
            for (const [betType, amount] of betData.bets) {
                const payout = this.calculatePayout(betType, amount, result, color);
                if (payout > 0) {
                    totalWinnings += payout;
                }
            }
            
            if (totalWinnings > 0) {
                try {
                    const profile = userProfiles.getUserProfile(userId);
                    profile.balance += totalWinnings;
                    userProfiles.saveProfile(userId, profile);
                    
                    // Log win
                    const channel = this.client.channels.cache.get(this.liveChannelId);
                    if (channel) {
                        await logManager.sendGamblingLog(this.client, channel.guild.id, {
                            type: 'win',
                            user: await this.client.users.fetch(userId),
                            game: 'Live Roulette',
                            amount: totalWinnings,
                            result: `${result} ${color}`
                        });
                    }
                } catch (error) {
                    console.error('Error processing payout for user:', userId, error);
                }
            }
        }
    }

    calculatePayout(betType, amount, result, color) {
        if (betType.startsWith('number_')) {
            const betNumber = parseInt(betType.split('_')[1]);
            return betNumber === result ? amount * 35 : 0;
        }
        
        switch (betType) {
            case 'red':
                return color === 'red' ? amount * 2 : 0;
            case 'black':
                return color === 'black' ? amount * 2 : 0;
            case 'even':
                return result !== 0 && result % 2 === 0 ? amount * 2 : 0;
            case 'odd':
                return result !== 0 && result % 2 === 1 ? amount * 2 : 0;
            case 'low':
                return result >= 1 && result <= 18 ? amount * 2 : 0;
            case 'high':
                return result >= 19 && result <= 36 ? amount * 2 : 0;
            case 'dozen1':
                return result >= 1 && result <= 12 ? amount * 3 : 0;
            case 'dozen2':
                return result >= 13 && result <= 24 ? amount * 3 : 0;
            case 'dozen3':
                return result >= 25 && result <= 36 ? amount * 3 : 0;
            default:
                return 0;
        }
    }

    async updateDisplay() {
        const channel = this.client.channels.cache.get(this.liveChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(this.bettingPhase ? '#00ff00' : '#ff0000')
            .setTitle('🎰 LIVE ROULETTE')
            .setDescription(this.bettingPhase ? '🟢 **BETTING OPEN** - Place your bets!' : '🔴 **BETTING CLOSED** - Spinning...')
            .addFields(
                { name: '⏰ Time Left', value: this.bettingPhase ? `${this.timeLeft} seconds` : 'Spinning...', inline: true },
                { name: '🎲 Total Bets', value: this.currentBets.size.toString(), inline: true },
                { name: '💰 Min Bet', value: '0.001 LTC', inline: true }
            )
            .setFooter({ text: 'Live Roulette • Spins every 30 seconds' })
            .setTimestamp();

        const components = this.bettingPhase ? this.createBettingButtons() : [];

        try {
            if (this.currentMessage) {
                await this.currentMessage.edit({ embeds: [embed], components });
            } else {
                this.currentMessage = await channel.send({ embeds: [embed], components });
            }
        } catch (error) {
            console.error('Error updating live roulette display:', error);
        }
    }

    createBettingButtons() {
        const colorRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('live_roulette_red')
                    .setLabel('Red (1:1)')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔴'),
                new ButtonBuilder()
                    .setCustomId('live_roulette_black')
                    .setLabel('Black (1:1)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚫'),
                new ButtonBuilder()
                    .setCustomId('live_roulette_odd')
                    .setLabel('Odd (1:1)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('1️⃣'),
                new ButtonBuilder()
                    .setCustomId('live_roulette_even')
                    .setLabel('Even (1:1)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('2️⃣')
            );

        return [colorRow];
    }

    placeBet(userId, betType, amount) {
        if (!this.bettingPhase) {
            return { success: false, message: 'Betting is closed for this round!' };
        }

        if (!this.currentBets.has(userId)) {
            this.currentBets.set(userId, { bets: new Map(), totalBet: 0 });
        }

        const userBets = this.currentBets.get(userId);
        
        // Add or update bet
        if (userBets.bets.has(betType)) {
            userBets.totalBet -= userBets.bets.get(betType);
        }
        
        userBets.bets.set(betType, amount);
        userBets.totalBet += amount;

        return { success: true, message: 'Bet placed successfully!' };
    }

    getUserBets(userId) {
        return this.currentBets.get(userId) || { bets: new Map(), totalBet: 0 };
    }
}

module.exports = LiveRoulette;