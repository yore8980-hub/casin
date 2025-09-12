const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');
const securityManager = require('../utils/securityManager.js');
const logManager = require('../utils/logManager.js');

// European roulette wheel mapping (0-36)
const wheel = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
    11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
    21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

// Active roulette sessions (single-use per /roulette command)
const rouletteSessions = new Map();

// GIF URL spécifié par l'utilisateur
const SPINNING_GIF = 'https://images-ext-1.discordapp.net/external/u8-37Lffp-3TZre-_9pbURs23xL1L9wpWWCMZtFAQtc/https/raw.githubusercontent.com/GiorgosLiaskosds20076/RoulettePics/main/spinning_gif.gif';

// Images de résultat avec boule blanche (exemples générés)
const RESULT_IMAGES = {
    0: 'attached_assets/generated_images/Roulette_result_number_0_4d73fe42.png',
    7: 'attached_assets/generated_images/Roulette_result_number_7_e4d0dd16.png',
    17: 'attached_assets/generated_images/Roulette_result_number_17_4b9041d3.png'
};

function formatLTC(amount) {
    return parseFloat(amount.toFixed(8)).toString();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('🎰 Start a single-use roulette session with 60s auto-timer!'),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        
        try {
            const userId = interaction.user.id;
            const channelId = interaction.channel.id;
            
            // Check if there's already an active session in this channel
            if (rouletteSessions.has(channelId)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Session Déjà Active')
                    .setDescription('Une session de roulette est déjà en cours dans ce canal!')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check password protection
            const userSec = securityManager.getUserSecurity(userId);
            if (!userSec.hasPassword) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🔒 Mot de Passe Requis')
                    .setDescription('Vous devez définir un mot de passe avant de jouer. Utilisez `/setpassword` d\'abord.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Start single-use roulette session with auto-timer
            await startRouletteSession(interaction);
            
        } catch (error) {
            console.error('Erreur roulette:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors du démarrage de la roulette.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

// Start single-use roulette session with automatic 60s timer
async function startRouletteSession(interaction) {
    const channelId = interaction.channel.id;
    const sessionId = Date.now().toString();
    
    // Create session with auto-timer
    const session = {
        id: sessionId,
        channelId: channelId,
        pendingBets: new Map(), // userId -> [{type, details, amount}]
        expiresAt: Date.now() + 60000, // 60 seconds from now
        isActive: true,
        hasSpun: false,
        timeoutId: null,
        selectedCategory: null, // Current selected betting category
        interaction: interaction
    };
    
    rouletteSessions.set(channelId, session);
    
    // Create the initial embed with timer
    const embed = createRouletteEmbed(session);
    const components = createRouletteComponents(session);
    
    await interaction.editReply({ 
        embeds: [embed], 
        components: components 
    });
    
    // Start automatic 60s timer
    startAutoTimer(session);
    
    console.log(`🎰 Single-use roulette session started in channel ${channelId} with auto-timer`);
}

// Create roulette embed
function createRouletteEmbed(session) {
    const remainingTime = Math.ceil((session.expiresAt - Date.now()) / 1000);
    const totalBets = Array.from(session.pendingBets.values()).reduce((sum, bets) => 
        sum + bets.reduce((betSum, bet) => betSum + bet.amount, 0), 0);
    
    let betsDescription = 'Aucun pari placé. Utilisez les contrôles ci-dessous.';
    if (session.pendingBets.size > 0) {
        const betsList = [];
        for (const [userId, bets] of session.pendingBets) {
            const userTotal = bets.reduce((sum, bet) => sum + bet.amount, 0);
            betsList.push(`<@${userId}>: ${formatLTC(userTotal)} LTC (${bets.length} paris)`);
        }
        betsDescription = betsList.join('\\n');
    }
    
    const embed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('🎰 Mont Olympus Casino | Roulette')
        .setDescription(`**📝 Paris en Cours**\\n\\n${betsDescription}`)
        .setImage(SPINNING_GIF)
        .addFields(
            {
                name: '⏱️ Timer Automatique',
                value: `Temps restant: **${remainingTime}s** • Total: ${formatLTC(totalBets)} LTC`,
                inline: false
            },
            {
                name: '🎯 Instructions',
                value: '1. Sélectionnez une catégorie de pari\\n2. Cliquez "Add Bet" pour placer votre mise\\n3. Le timer se remet à 60s à chaque nouveau pari\\n4. La roulette tourne automatiquement à la fin du timer',
                inline: false
            }
        )
        .setTimestamp();
    
    return embed;
}

// Create roulette components
function createRouletteComponents(session) {
    const isExpired = session.hasSpun || Date.now() >= session.expiresAt;
    
    // Category selection dropdown
    const categorySelect = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('live_roulette_category')
                .setPlaceholder('Choisissez votre catégorie de pari...')
                .setDisabled(isExpired)
                .addOptions([
                    {
                        label: 'Number',
                        value: 'number',
                        description: 'Pariez sur des numéros spécifiques (35:1)',
                        emoji: '🎯'
                    },
                    {
                        label: 'Color',
                        value: 'color',
                        description: 'Rouge ou Noir (1:1)',
                        emoji: '🎨'
                    },
                    {
                        label: 'Dozen',
                        value: 'dozen',
                        description: '1st12, 2nd12, 3rd12 (2:1)',
                        emoji: '📊'
                    },
                    {
                        label: 'Column',
                        value: 'column',
                        description: '1st, 2nd, 3rd column (2:1)',
                        emoji: '📋'
                    },
                    {
                        label: 'Even/Odd',
                        value: 'evenodd',
                        description: 'Pair ou Impair (1:1)',
                        emoji: '⚖️'
                    },
                    {
                        label: 'Range',
                        value: 'range',
                        description: '1-18 ou 19-36 (1:1)',
                        emoji: '📏'
                    }
                ])
        );
    
    // Action buttons (no manual start timer button)
    const actionButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('live_roulette_add_bet')
                .setLabel('Add Bet (sélectionnez une catégorie d\'abord)')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true), // Disabled until category selected
            new ButtonBuilder()
                .setCustomId('live_roulette_end_session')
                .setLabel('Arrêter la Session')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🛑')
                .setDisabled(isExpired)
        );
    
    return [categorySelect, actionButtons];
}

// Start or restart the automatic timer (resets on new bets)
function startAutoTimer(session) {
    // Clear existing timer if any
    if (session.timeoutId) {
        clearTimeout(session.timeoutId);
    }
    
    // Set new timer for 60 seconds
    session.expiresAt = Date.now() + 60000;
    
    session.timeoutId = setTimeout(async () => {
        if (rouletteSessions.has(session.channelId) && !session.hasSpun) {
            // Auto-spin when timer expires
            if (session.pendingBets.size > 0) {
                session.hasSpun = true;
                await performSpin(session);
            } else {
                // No bets, end session
                await endRouletteSession(session.channelId);
            }
        }
    }, 60000);
    
    console.log(`⏰ Auto-timer started/reset for channel ${session.channelId}`);
}

// Perform the spin
async function performSpin(session) {
    try {
        // Generate random result
        const result = Math.floor(Math.random() * 37);
        const resultColor = wheel[result];
        
        // Show spinning animation first
        const spinningEmbed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('🎰 La Roulette Tourne...')
            .setDescription('La bille roule sur la roulette...')
            .setImage(SPINNING_GIF)
            .setTimestamp();
        
        await session.interaction.editReply({ 
            embeds: [spinningEmbed], 
            components: [] 
        });
        
        // Wait 3 seconds for animation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Calculate all winnings
        const allWinnings = new Map();
        let totalBetAmount = 0;
        
        for (const [userId, bets] of session.pendingBets) {
            let userTotalPayout = 0;
            let userBetAmount = 0;
            
            for (const bet of bets) {
                userBetAmount += bet.amount;
                totalBetAmount += bet.amount;
                
                const payout = calculatePayout(bet, result);
                if (payout > 0) {
                    userTotalPayout += payout;
                }
            }
            
            if (userTotalPayout > 0) {
                // Update user balance
                const profile = userProfiles.getUserProfile(userId);
                userProfiles.updateUserProfile(userId, { 
                    balance: profile.balance + userTotalPayout 
                });
                
                allWinnings.set(userId, { totalPayout: userTotalPayout });
            }
        }
        
        // Show final result
        await showFinalResult(session, result, allWinnings, totalBetAmount);
        
        // End session
        await endRouletteSession(session.channelId);
        
    } catch (error) {
        console.error('Erreur lors du spin:', error);
    }
}

// Calculate bet payout
function calculatePayout(bet, result) {
    const { type, details, amount } = bet;
    
    switch (type) {
        case 'number':
            const numbers = details.split(',').map(n => parseInt(n.trim()));
            return numbers.includes(result) ? amount * 35 : 0;
            
        case 'color':
            if (result === 0) return 0; // Green doesn't win on color bets
            return wheel[result] === details ? amount * 1 : 0;
            
        case 'dozen':
            let dozenRange;
            if (details === '1st12') dozenRange = [1, 12];
            else if (details === '2nd12') dozenRange = [13, 24];
            else if (details === '3rd12') dozenRange = [25, 36];
            return (result >= dozenRange[0] && result <= dozenRange[1]) ? amount * 2 : 0;
            
        case 'column':
            let columnNumbers;
            if (details === '1st column') columnNumbers = [1,4,7,10,13,16,19,22,25,28,31,34];
            else if (details === '2nd column') columnNumbers = [2,5,8,11,14,17,20,23,26,29,32,35];
            else if (details === '3rd column') columnNumbers = [3,6,9,12,15,18,21,24,27,30,33,36];
            return columnNumbers.includes(result) ? amount * 2 : 0;
            
        case 'evenodd':
            if (result === 0) return 0;
            const isEven = result % 2 === 0;
            return ((details === 'even' && isEven) || (details === 'odd' && !isEven)) ? amount * 1 : 0;
            
        case 'range':
            if (result === 0) return 0;
            return ((details === '1-18' && result <= 18) || (details === '19-36' && result >= 19)) ? amount * 1 : 0;
            
        default:
            return 0;
    }
}

// Show final result with winning number and image
async function showFinalResult(session, result, allWinnings, totalBetAmount) {
    const resultColor = wheel[result];
    const colorEmoji = resultColor === 'red' ? '🔴' : resultColor === 'black' ? '⚫' : '🟢';
    
    let title = '🎰 Résultat de la Roulette';
    let color = '#9932cc';
    let description = `🎯 **La bille s'est arrêtée sur le ${result}** ${colorEmoji}`;
    
    const totalWinnings = Array.from(allWinnings.values()).reduce((sum, w) => sum + w.totalPayout, 0);
    
    if (totalWinnings > 0) {
        title = '🎉 FÉLICITATIONS ! Il y a des gagnants !';
        color = '#00ff00';
        description += `\\n\\n💰 **Gains totaux distribués: ${formatLTC(totalWinnings)} LTC**`;
    } else {
        title = '💸 La Maison Gagne';
        color = '#ff0000';
        description += `\\n\\n💔 **Perdu: ${formatLTC(totalBetAmount)} LTC**`;
    }
    
    // Use specific result image if available, otherwise use spinning gif
    const resultImage = RESULT_IMAGES[result] || SPINNING_GIF;
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setImage(resultImage) // Shows result with white ball on winning number
        .addFields(
            {
                name: '🎯 Numéro Gagnant',
                value: `**${result}** ${colorEmoji} (${resultColor === 'red' ? 'Rouge' : resultColor === 'black' ? 'Noir' : 'Vert'})`,
                inline: true
            }
        )
        .setTimestamp();
    
    // Add individual winners if any
    if (allWinnings.size > 0) {
        let winnersText = '';
        for (const [userId, data] of allWinnings) {
            const user = await session.interaction.client.users.fetch(userId);
            winnersText += `• **${user.username}**: ${formatLTC(data.totalPayout)} LTC\\n`;
        }
        embed.addFields({
            name: '🏆 Gagnants',
            value: winnersText,
            inline: false
        });
    }
    
    await session.interaction.editReply({ embeds: [embed], components: [] });
    
    // Log the game for each participant
    for (const [userId, bets] of session.pendingBets) {
        const user = await session.interaction.client.users.fetch(userId);
        const userBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
        const userWinnings = allWinnings.get(userId)?.totalPayout || 0;
        
        await logManager.sendGamblingLog(session.interaction.client, session.interaction.guild.id, {
            type: 'roulette',
            user: user,
            game: 'roulette',
            bet: userBetAmount,
            result: userWinnings > 0 ? 'win' : 'lose',
            payout: userWinnings,
            details: `Résultat: ${result} ${colorEmoji}, ${bets.length} paris placés`
        });
    }
}

// End roulette session
async function endRouletteSession(channelId) {
    const session = rouletteSessions.get(channelId);
    if (!session) return;
    
    // Clear timer if active
    if (session.timeoutId) {
        clearTimeout(session.timeoutId);
    }
    
    // Refund any pending bets if session ended without spinning
    if (!session.hasSpun && session.pendingBets.size > 0) {
        for (const [userId, userBets] of session.pendingBets) {
            let totalRefund = 0;
            for (const bet of userBets) {
                totalRefund += bet.amount;
            }
            
            if (totalRefund > 0) {
                const profile = userProfiles.getUserProfile(userId);
                userProfiles.updateUserProfile(userId, { 
                    balance: profile.balance + totalRefund 
                });
            }
        }
    }
    
    rouletteSessions.delete(channelId);
    console.log(`🎰 Single-use roulette session ended in channel ${channelId}`);
}

// Export functions for use in discord-bot.js
module.exports.rouletteSessions = rouletteSessions;
module.exports.startAutoTimer = startAutoTimer;
module.exports.performSpin = performSpin;
module.exports.endRouletteSession = endRouletteSession;
module.exports.createRouletteEmbed = createRouletteEmbed;
module.exports.createRouletteComponents = createRouletteComponents;