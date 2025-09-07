const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const CONFIG_FILE = path.join(__dirname, '../data/log_config.json');

function loadLogConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading log config:', error.message);
    }
    return {};
}

/**
 * Send balance log to configured channel
 * @param {Object} client - Discord client
 * @param {string} serverId - Server ID
 * @param {Object} logData - Log data
 */
async function sendBalanceLog(client, serverId, logData) {
    try {
        const config = loadLogConfig();
        const channelId = config[serverId]?.balanceLogChannel;
        
        if (!channelId) {
            console.log('No balance log channel configured for server:', serverId);
            return;
        }
        
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.log('Balance log channel not found:', channelId);
            return;
        }
        
        const embed = createBalanceLogEmbed(logData);
        await channel.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error sending balance log:', error.message);
    }
}

/**
 * Send gambling log to configured channel
 * @param {Object} client - Discord client
 * @param {string} serverId - Server ID
 * @param {Object} logData - Log data
 */
async function sendGamblingLog(client, serverId, logData) {
    try {
        const config = loadLogConfig();
        const channelId = config[serverId]?.gamblingLogChannel;
        
        if (!channelId) {
            console.log('No gambling log channel configured for server:', serverId);
            return;
        }
        
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.log('Gambling log channel not found:', channelId);
            return;
        }
        
        const embed = createGamblingLogEmbed(logData);
        await channel.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error sending gambling log:', error.message);
    }
}

/**
 * Create balance log embed
 * @param {Object} logData - Log data
 * @returns {EmbedBuilder} Embed
 */
function createBalanceLogEmbed(logData) {
    const { type, user, amount, address, details } = logData;
    
    let embed = new EmbedBuilder()
        .setTimestamp();
    
    switch (type) {
        case 'deposit':
            embed
                .setColor('#00ff00')
                .setTitle('💰 Deposit Confirmed')
                .setDescription(`User ${user.username} deposited **${amount} LTC**`)
                .addFields(
                    {
                        name: '👤 User',
                        value: `${user} (${user.id})`,
                        inline: true
                    },
                    {
                        name: '💰 Amount',
                        value: `${amount} LTC`,
                        inline: true
                    },
                    {
                        name: '📍 Address',
                        value: `\`${address}\``,
                        inline: false
                    }
                );
            break;
            
        case 'address_generated':
            embed
                .setColor('#0099ff')
                .setTitle('🔑 Deposit Address Generated')
                .setDescription(`New deposit address created for ${user.username}`)
                .addFields(
                    {
                        name: '👤 User',
                        value: `${user} (${user.id})`,
                        inline: true
                    },
                    {
                        name: '📍 Address',
                        value: `\`${address}\``,
                        inline: false
                    }
                );
            break;
            
        case 'channel_closed':
            embed
                .setColor('#ffaa00')
                .setTitle('🔒 Deposit Channel Closed')
                .setDescription(`Deposit channel closed for ${user.username}`)
                .addFields(
                    {
                        name: '👤 User',
                        value: `${user} (${user.id})`,
                        inline: true
                    },
                    {
                        name: '⏱️ Reason',
                        value: details || 'Auto-close after 20 minutes',
                        inline: true
                    }
                );
            break;
    }
    
    return embed;
}

/**
 * Create gambling log embed
 * @param {Object} logData - Log data
 * @returns {EmbedBuilder} Embed
 */
function createGamblingLogEmbed(logData) {
    const { type, user, game, bet, result, payout, details } = logData;
    
    let embed = new EmbedBuilder()
        .setTimestamp();
    
    switch (type) {
        case 'blackjack':
            embed
                .setColor(result === 'win' ? '#00ff00' : result === 'lose' ? '#ff0000' : '#ffaa00')
                .setTitle('🃏 Blackjack Game')
                .setDescription(`${user.username} ${result === 'win' ? 'won' : result === 'lose' ? 'lost' : 'tied'} ${bet} LTC`)
                .addFields(
                    {
                        name: '👤 Player',
                        value: `${user} (${user.id})`,
                        inline: true
                    },
                    {
                        name: '💰 Bet',
                        value: `${bet} LTC`,
                        inline: true
                    },
                    {
                        name: '🎰 Result',
                        value: result.toUpperCase(),
                        inline: true
                    },
                    {
                        name: '💵 Payout',
                        value: `${payout || 0} LTC`,
                        inline: true
                    }
                );
            
            if (details) {
                embed.addFields({
                    name: '📋 Game Details',
                    value: details,
                    inline: false
                });
            }
            break;
            
        case 'roulette':
            embed
                .setColor(result === 'win' ? '#00ff00' : '#ff0000')
                .setTitle('🎰 Roulette Spin')
                .setDescription(`${user.username} ${result === 'win' ? 'won' : 'lost'} ${bet} LTC`)
                .addFields(
                    {
                        name: '👤 Player',
                        value: `${user} (${user.id})`,
                        inline: true
                    },
                    {
                        name: '💰 Bet',
                        value: `${bet} LTC`,
                        inline: true
                    },
                    {
                        name: '🎰 Result',
                        value: result.toUpperCase(),
                        inline: true
                    },
                    {
                        name: '💵 Payout',
                        value: `${payout || 0} LTC`,
                        inline: true
                    }
                );
            
            if (details) {
                embed.addFields({
                    name: '📋 Spin Details',
                    value: details,
                    inline: false
                });
            }
            break;
            
        case 'big_win':
            embed
                .setColor('#ffd700')
                .setTitle('🏆 BIG WIN!')
                .setDescription(`${user.username} hit a big win of **${payout} LTC**!`)
                .addFields(
                    {
                        name: '👤 Winner',
                        value: `${user} (${user.id})`,
                        inline: true
                    },
                    {
                        name: '🎮 Game',
                        value: game.toUpperCase(),
                        inline: true
                    },
                    {
                        name: '💰 Bet',
                        value: `${bet} LTC`,
                        inline: true
                    },
                    {
                        name: '🏆 Win Amount',
                        value: `${payout} LTC`,
                        inline: true
                    }
                );
            break;
    }
    
    return embed;
}

module.exports = {
    sendBalanceLog,
    sendGamblingLog,
    createBalanceLogEmbed,
    createGamblingLogEmbed
};