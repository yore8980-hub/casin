const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');
const securityManager = require('../utils/securityManager.js');
const logManager = require('../utils/logManager.js');
const { formatLTC } = require('../utils/formatters.js');

// Roulette wheel numbers and colors
const wheel = {
    0: 'green',
    1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
    7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
    13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
    25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

// Active spins storage
const activeSpins = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play Roulette - place your bets!')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet in LTC')
                .setRequired(true)
                .setMinValue(0.001)
        ),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction too old, ignored');
            return;
        }
        
        await interaction.deferReply({ ephemeral: false });
        
        try {
            const bet = interaction.options.getNumber('bet');
            const userId = interaction.user.id;
            
            // Check if user has active spin
            if (activeSpins.has(userId)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Spin Already Active')
                    .setDescription('You already have an active roulette spin. Wait for it to finish!')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Get user profile and verify balance
            const profile = userProfiles.getUserProfile(userId);
            
            if (profile.balance < bet) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Balance')
                    .setDescription(`You need **${formatLTC(bet)} LTC** to play but only have **${formatLTC(profile.balance)} LTC**.`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check password protection
            const userSec = securityManager.getUserSecurity(userId);
            if (!userSec.hasPassword) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🔒 Password Required')
                    .setDescription('You need to set a password before gambling. Use `/setpassword` first.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Create new spin
            const spin = {
                userId: userId,
                bet: bet,
                bets: new Map(),
                status: 'betting',
                result: null,
                totalPayout: 0,
                startTime: Date.now()
            };
            
            activeSpins.set(userId, spin);
            
            // Show betting interface
            const bettingEmbed = createBettingEmbed(spin, interaction.user);
            const bettingComponents = createBettingComponents();
            
            await interaction.editReply({ 
                embeds: [bettingEmbed],
                components: bettingComponents
            });
            
            // Auto-timeout after 2 minutes
            setTimeout(() => {
                if (activeSpins.has(userId)) {
                    const timeoutSpin = activeSpins.get(userId);
                    if (timeoutSpin.status === 'betting') {
                        timeoutSpin.status = 'timeout';
                        activeSpins.delete(userId);
                        console.log(`🕐 Roulette spin timed out for ${interaction.user.username}`);
                    }
                }
            }, 120000);
            
        } catch (error) {
            console.error('Erreur roulette:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while starting the roulette game.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

function createBettingEmbed(spin, user) {
    const embed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('🎰 Roulette - Place Your Bets!')
        .setDescription(`**Available to bet:** ${formatLTC(spin.bet)} LTC`)
        .addFields(
            {
                name: '🎯 How to Play',
                value: '• Choose your betting options below\n• Numbers pay 35:1\n• Colors (Red/Black) pay 1:1\n• Even/Odd pay 1:1\n• High/Low pay 1:1',
                inline: false
            },
            {
                name: '💰 Current Bets',
                value: spin.bets.size > 0 ? formatBets(spin.bets) : 'No bets placed yet',
                inline: false
            }
        )
        .setFooter({ text: 'Select your bets below, then click Spin!' })
        .setTimestamp();
    
    return embed;
}

function createBettingComponents() {
    const colorRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('roulette_bet_red')
                .setLabel('Red (1:1)')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔴'),
            new ButtonBuilder()
                .setCustomId('roulette_bet_black')
                .setLabel('Black (1:1)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚫'),
            new ButtonBuilder()
                .setCustomId('roulette_bet_green')
                .setLabel('Green (35:1)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🟢')
        );
    
    const oddEvenRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('roulette_bet_even')
                .setLabel('Even (1:1)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('2️⃣'),
            new ButtonBuilder()
                .setCustomId('roulette_bet_odd')
                .setLabel('Odd (1:1)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('1️⃣'),
            new ButtonBuilder()
                .setCustomId('roulette_bet_low')
                .setLabel('Low 1-18 (1:1)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔽'),
            new ButtonBuilder()
                .setCustomId('roulette_bet_high')
                .setLabel('High 19-36 (1:1)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔼')
        );
    
    const numberSelect = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('roulette_bet_number')
                .setPlaceholder('Choose a number (0-36) for 35:1 payout')
                .addOptions(
                    Array.from({ length: 37 }, (_, i) => ({
                        label: `Number ${i}`,
                        value: `number_${i}`,
                        description: `Bet on ${i} (35:1 payout)`,
                        emoji: i === 0 ? '🟢' : (wheel[i] === 'red' ? '🔴' : '⚫')
                    }))
                )
        );
    
    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('roulette_spin')
                .setLabel('🎰 SPIN!')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎰'),
            new ButtonBuilder()
                .setCustomId('roulette_clear')
                .setLabel('Clear Bets')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('roulette_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );
    
    return [colorRow, oddEvenRow, numberSelect, actionRow];
}

function formatBets(bets) {
    let betString = '';
    let totalBet = 0;
    
    for (const [betType, amount] of bets) {
        betString += `• **${betType}**: ${formatLTC(amount)} LTC\n`;
        totalBet += amount;
    }
    
    betString += `\n**Total Bet**: ${formatLTC(totalBet)} LTC`;
    return betString;
}

function spinWheel() {
    return Math.floor(Math.random() * 37);
}

function calculatePayout(bets, result) {
    let totalPayout = 0;
    const winningBets = [];
    
    for (const [betType, amount] of bets) {
        let won = false;
        let multiplier = 0;
        
        if (betType.startsWith('number_')) {
            const number = parseInt(betType.split('_')[1]);
            if (number === result) {
                won = true;
                multiplier = 35;
            }
        } else if (betType === 'red' && wheel[result] === 'red') {
            won = true;
            multiplier = 1;
        } else if (betType === 'black' && wheel[result] === 'black') {
            won = true;
            multiplier = 1;
        } else if (betType === 'green' && wheel[result] === 'green') {
            won = true;
            multiplier = 35;
        } else if (betType === 'even' && result !== 0 && result % 2 === 0) {
            won = true;
            multiplier = 1;
        } else if (betType === 'odd' && result % 2 === 1) {
            won = true;
            multiplier = 1;
        } else if (betType === 'low' && result >= 1 && result <= 18) {
            won = true;
            multiplier = 1;
        } else if (betType === 'high' && result >= 19 && result <= 36) {
            won = true;
            multiplier = 1;
        }
        
        if (won) {
            const payout = amount * (multiplier + 1);
            totalPayout += payout;
            winningBets.push({ betType, amount, payout, multiplier });
        }
    }
    
    return { totalPayout, winningBets };
}

function createResultEmbed(spin, result, payout, winningBets, user) {
    const resultColor = wheel[result];
    const colorEmoji = resultColor === 'red' ? '🔴' : resultColor === 'black' ? '⚫' : '🟢';
    
    let title = '🎰 Roulette Result';
    let color = '#9932cc';
    let description = `The ball landed on **${result}** ${colorEmoji}`;
    
    if (payout > 0) {
        title = '🎉 You Win!';
        color = '#00ff00';
        description += `\n\nYou won **${formatLTC(payout)} LTC**!`;
    } else {
        title = '💸 House Wins';
        color = '#ff0000';
        description += `\n\nBetter luck next time!`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .addFields(
            {
                name: '🎯 Winning Number',
                value: `**${result}** ${colorEmoji} (${resultColor})`,
                inline: true
            }
        );
    
    if (winningBets.length > 0) {
        const winningBetsStr = winningBets.map(bet => 
            `• **${bet.betType}**: ${formatLTC(bet.amount)} LTC → ${formatLTC(bet.payout)} LTC (${bet.multiplier + 1}x)`
        ).join('\n');
        
        embed.addFields({
            name: '🏆 Winning Bets',
            value: winningBetsStr,
            inline: false
        });
    }
    
    const profile = userProfiles.getUserProfile(spin.userId);
    embed.addFields({
        name: '💰 New Balance',
        value: `${formatLTC(profile.balance)} LTC`,
        inline: true
    });
    
    return embed;
}

module.exports.activeSpins = activeSpins;
module.exports.spinWheel = spinWheel;
module.exports.calculatePayout = calculatePayout;
module.exports.createResultEmbed = createResultEmbed;
module.exports.createBettingEmbed = createBettingEmbed;
module.exports.createBettingComponents = createBettingComponents;
module.exports.wheel = wheel;