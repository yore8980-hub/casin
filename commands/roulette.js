const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

// Live roulette sessions storage
const liveRouletteSessions = new Map();

// GIF URLs
const SPINNING_GIF = 'https://images-ext-1.discordapp.net/external/u8-37Lffp-3TZre-_9pbURs23xL1L9wpWWCMZtFAQtc/https/raw.githubusercontent.com/GiorgosLiaskosds20076/RoulettePics/main/spinning_gif.gif';
const TABLE_IMAGE = 'https://raw.githubusercontent.com/GiorgosLiaskosds20076/RoulettePics/main/roulette_table.png';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('🎰 Start a live roulette session!'),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        
        try {
            const userId = interaction.user.id;
            const channelId = interaction.channel.id;
            
            // Check if there's already a live session in this channel
            if (liveRouletteSessions.has(channelId)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Session Déjà Active')
                    .setDescription('Une session de roulette live est déjà en cours dans ce canal!')
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
            
            // Start live roulette session
            await startLiveRouletteSession(interaction);
            
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
    
    const numberSelect1 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('roulette_bet_number_1')
                .setPlaceholder('Numbers 0-24 (35:1 payout)')
                .addOptions(
                    Array.from({ length: 25 }, (_, i) => ({
                        label: `Number ${i}`,
                        value: `number_${i}`,
                        description: `Bet on ${i} (35:1 payout)`,
                        emoji: i === 0 ? '🟢' : (wheel[i] === 'red' ? '🔴' : '⚫')
                    }))
                )
        );
        
    const numberSelect2 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('roulette_bet_number_2')
                .setPlaceholder('Numbers 25-36 (35:1 payout)')
                .addOptions(
                    Array.from({ length: 12 }, (_, i) => {
                        const num = i + 25;
                        return {
                            label: `Number ${num}`,
                            value: `number_${num}`,
                            description: `Bet on ${num} (35:1 payout)`,
                            emoji: wheel[num] === 'red' ? '🔴' : '⚫'
                        };
                    })
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
    
    // Add dozens and columns betting
    const dozensRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('roulette_bet_dozen1')
                .setLabel('1st Dozen (1-12)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('1️⃣'),
            new ButtonBuilder()
                .setCustomId('roulette_bet_dozen2')
                .setLabel('2nd Dozen (13-24)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('2️⃣'),
            new ButtonBuilder()
                .setCustomId('roulette_bet_dozen3')
                .setLabel('3rd Dozen (25-36)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('3️⃣')
        );

    return [colorRow, oddEvenRow, dozensRow, numberSelect1, actionRow];
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

// Create modal for specific bet type
function createBetModal(betType) {
    const modal = new ModalBuilder()
        .setCustomId(`live_roulette_modal_${betType}`)
        .setTitle(`Add ${betType.charAt(0).toUpperCase() + betType.slice(1)} Bet`);
    
    let choiceInput, amountInput;
    
    if (betType === 'number') {
        choiceInput = new TextInputBuilder()
            .setCustomId('bet_choice')
            .setLabel('Numéros (séparés par virgule et espace)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 7, 12, 19')
            .setRequired(true);
    } else if (betType === 'color') {
        choiceInput = new TextInputBuilder()
            .setCustomId('bet_choice')
            .setLabel('Couleur (red ou black)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('red ou black')
            .setRequired(true);
    } else if (betType === 'dozen') {
        choiceInput = new TextInputBuilder()
            .setCustomId('bet_choice')
            .setLabel('Douzaine (1st12, 2nd12, ou 3rd12)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1st12, 2nd12, ou 3rd12')
            .setRequired(true);
    } else if (betType === 'column') {
        choiceInput = new TextInputBuilder()
            .setCustomId('bet_choice')
            .setLabel('Colonne (1st column, 2nd column, ou 3rd column)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1st column, 2nd column, ou 3rd column')
            .setRequired(true);
    } else if (betType === 'evenodd') {
        choiceInput = new TextInputBuilder()
            .setCustomId('bet_choice')
            .setLabel('Pair ou Impair (even ou odd)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('even ou odd')
            .setRequired(true);
    } else if (betType === 'range') {
        choiceInput = new TextInputBuilder()
            .setCustomId('bet_choice')
            .setLabel('Range (1-18 ou 19-36)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1-18 ou 19-36')
            .setRequired(true);
    }
    
    amountInput = new TextInputBuilder()
        .setCustomId('bet_amount')
        .setLabel('Montant en LTC')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 0.01')
        .setRequired(true);
    
    const choiceRow = new ActionRowBuilder().addComponents(choiceInput);
    const amountRow = new ActionRowBuilder().addComponents(amountInput);
    
    modal.addComponents(choiceRow, amountRow);
    return modal;
}

// Spin the wheel
function spinWheel() {
    return Math.floor(Math.random() * 37);
}

// Perform the spin with animation
async function performSpin(interaction, session) {
    // Calculate total bets and check balances
    let totalBetAmount = 0;
    const userBets = new Map();
    
    for (const [userId, bets] of session.pendingBets) {
        let userTotal = 0;
        for (const bet of bets) {
            userTotal += bet.amount;
        }
        userBets.set(userId, userTotal);
        totalBetAmount += userTotal;
    }
    
    // Deduct bets from user balances and add wagered amounts
    for (const [userId, amount] of userBets) {
        const profile = userProfiles.getUserProfile(userId);
        userProfiles.updateUserProfile(userId, { 
            balance: profile.balance - amount 
        });
        securityManager.addWageredAmount(userId, amount);
    }
    
    // Show spinning animation
    const spinningEmbed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('Mont Olympus Casino | Roulette')
        .setDescription('🌀 **LA ROULETTE TOURNE!** 🌀')
        .setImage(SPINNING_GIF)
        .addFields(
            { name: '🎲 Statut', value: 'La bille tourne...', inline: false }
        )
        .setTimestamp();
    
    await interaction.editReply({ embeds: [spinningEmbed], components: [] });
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate result
    const result = spinWheel();
    
    // Calculate payouts for all users
    let totalPayouts = 0;
    const allWinnings = new Map();
    
    for (const [userId, bets] of session.pendingBets) {
        const { totalPayout, winningBets } = calculatePayout(bets, result);
        if (totalPayout > 0) {
            allWinnings.set(userId, { totalPayout, winningBets });
            totalPayouts += totalPayout;
            
            // Update user balance with winnings
            const profile = userProfiles.getUserProfile(userId);
            userProfiles.updateUserProfile(userId, { 
                balance: profile.balance + totalPayout 
            });
        }
    }
    
    // Show final result
    await showFinalResult(interaction, result, session, allWinnings, totalBetAmount);
    
    // Clean up session
    liveRouletteSessions.delete(session.channelId);
}

// Show final result with winning number and image
async function showFinalResult(interaction, result, session, allWinnings, totalBetAmount) {
    const resultColor = wheel[result];
    const colorEmoji = resultColor === 'red' ? '🔴' : resultColor === 'black' ? '⚫' : '🟢';
    
    let title = '🎰 Résultat de la Roulette';
    let color = '#9932cc';
    let description = `🎯 **La bille s'est arrêtée sur le ${result}** ${colorEmoji}`;
    
    const totalWinnings = Array.from(allWinnings.values()).reduce((sum, w) => sum + w.totalPayout, 0);
    
    if (totalWinnings > 0) {
        title = '🎉 FÉLICITATIONS ! Il y a des gagnants !';
        color = '#00ff00';
        description += `\n\n💰 **Gains totaux distribués: ${formatLTC(totalWinnings)} LTC**`;
    } else {
        title = '💸 La Maison Gagne';
        color = '#ff0000';
        description += `\n\n💔 **Perdu: ${formatLTC(totalBetAmount)} LTC**`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setImage(TABLE_IMAGE) // This should show the roulette table with a white dot on the winning number
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
            const user = await interaction.client.users.fetch(userId);
            winnersText += `• **${user.username}**: ${formatLTC(data.totalPayout)} LTC\n`;
        }
        embed.addFields({
            name: '🏆 Gagnants',
            value: winnersText,
            inline: false
        });
    }
    
    await interaction.editReply({ embeds: [embed], components: [] });
    
    // Log the game for each participant
    for (const [userId, bets] of session.pendingBets) {
        const user = await interaction.client.users.fetch(userId);
        const userBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
        const userWinnings = allWinnings.get(userId)?.totalPayout || 0;
        
        await logManager.sendGamblingLog(interaction.client, interaction.guild.id, {
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

function calculatePayout(bets, result) {
    let totalPayout = 0;
    const winningBets = [];
    
    for (const bet of bets) {
        let won = false;
        let multiplier = 0;
        
        if (bet.type === 'number') {
            // Check if any of the numbers won
            if (bet.details.includes(result)) {
                won = true;
                multiplier = 35;
            }
        } else if (bet.type === 'color') {
            if ((bet.details === 'red' && wheel[result] === 'red') ||
                (bet.details === 'black' && wheel[result] === 'black')) {
                won = true;
                multiplier = 1;
            }
        } else if (bet.type === 'dozen') {
            if ((bet.details === '1st12' && result >= 1 && result <= 12) ||
                (bet.details === '2nd12' && result >= 13 && result <= 24) ||
                (bet.details === '3rd12' && result >= 25 && result <= 36)) {
                won = true;
                multiplier = 2;
            }
        } else if (bet.type === 'column') {
            // Column logic: 1st column (1,4,7,10,13,16,19,22,25,28,31,34)
            // 2nd column (2,5,8,11,14,17,20,23,26,29,32,35)
            // 3rd column (3,6,9,12,15,18,21,24,27,30,33,36)
            if (result > 0) {
                const column = ((result - 1) % 3) + 1;
                if ((bet.details === '1st column' && column === 1) ||
                    (bet.details === '2nd column' && column === 2) ||
                    (bet.details === '3rd column' && column === 3)) {
                    won = true;
                    multiplier = 2;
                }
            }
        } else if (bet.type === 'evenodd') {
            if (result > 0) {
                if ((bet.details === 'even' && result % 2 === 0) ||
                    (bet.details === 'odd' && result % 2 === 1)) {
                    won = true;
                    multiplier = 1;
                }
            }
        } else if (bet.type === 'range') {
            if ((bet.details === '1-18' && result >= 1 && result <= 18) ||
                (bet.details === '19-36' && result >= 19 && result <= 36)) {
                won = true;
                multiplier = 1;
            }
        }
        
        if (won) {
            const payout = bet.amount * (multiplier + 1);
            totalPayout += payout;
            winningBets.push({ ...bet, payout, multiplier });
        }
    }
    
    return { totalPayout, winningBets };
}

// End live roulette session
async function endLiveRouletteSession(channelId, client) {
    const session = liveRouletteSessions.get(channelId);
    if (!session || !session.isActive) return;
    
    session.isActive = false;
    
    // Refund all pending bets
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
    
    liveRouletteSessions.delete(channelId);
    console.log(`🎰 Live roulette session ended in channel ${channelId}`);
}

// Start Live Roulette Session with proper dropdown flow
async function startLiveRouletteSession(interaction) {
    const channelId = interaction.channel.id;
    
    try {
        // Create the main roulette interface with dropdown
        const mainEmbed = new EmbedBuilder()
            .setColor('#9932cc')
            .setTitle('🎰 Live Roulette Session Started!')
            .setDescription('Welcome to Live Roulette! Choose your betting category from the dropdown menu below.')
            .addFields(
                {
                    name: '🎯 How to Play',
                    value: '1️⃣ Select a betting category from the dropdown\n2️⃣ Click "Add Bet" to place your wager\n3️⃣ Fill in the bet details in the modal\n4️⃣ Wait for the 60-second timer to complete\n5️⃣ Watch the wheel spin and see if you win!',
                    inline: false
                },
                {
                    name: '💰 Betting Options',
                    value: '• **Numbers (0-36)**: 35:1 payout\n• **Colors (Red/Black)**: 1:1 payout\n• **Even/Odd**: 1:1 payout\n• **High/Low (1-18/19-36)**: 1:1 payout\n• **Dozens (1-12, 13-24, 25-36)**: 2:1 payout',
                    inline: false
                },
                {
                    name: '⚠️ Important',
                    value: '• Minimum bet: 0.001 LTC\n• Betting closes after 60 seconds\n• You must have a password set to play',
                    inline: false
                }
            )
            .setImage(TABLE_IMAGE)
            .setFooter({ text: 'Live Roulette • Select category and place your bets' })
            .setTimestamp();
        
        // Create dropdown for betting categories
        const categorySelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('live_roulette_category')
                    .setPlaceholder('Choose your betting category...')
                    .addOptions([
                        {
                            label: 'Single Numbers (0-36)',
                            description: 'Bet on a specific number - 35:1 payout',
                            value: 'number',
                            emoji: '🎲'
                        },
                        {
                            label: 'Colors (Red/Black)',
                            description: 'Bet on red or black - 1:1 payout',
                            value: 'color',
                            emoji: '🎨'
                        },
                        {
                            label: 'Even/Odd',
                            description: 'Bet on even or odd numbers - 1:1 payout',
                            value: 'evenodd',
                            emoji: '⚖️'
                        },
                        {
                            label: 'High/Low (1-18/19-36)',
                            description: 'Bet on number ranges - 1:1 payout',
                            value: 'range',
                            emoji: '📊'
                        },
                        {
                            label: 'Dozens (1-12, 13-24, 25-36)',
                            description: 'Bet on number groups - 2:1 payout',
                            value: 'dozen',
                            emoji: '🔢'
                        }
                    ])
            );
        
        // Control buttons
        const controlButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('live_roulette_add_bet')
                    .setLabel('Add Bet')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('live_roulette_view_bets')
                    .setLabel('View My Bets')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('live_roulette_start_timer')
                    .setLabel('Start 60s Timer')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⏰'),
                new ButtonBuilder()
                    .setCustomId('live_roulette_end_session')
                    .setLabel('End Session')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );
        
        // Send the main interface
        const message = await interaction.editReply({
            embeds: [mainEmbed],
            components: [categorySelect, controlButtons]
        });
        
        // Start the live roulette system using the LiveRoulette class
        const LiveRoulette = require('../utils/liveRoulette.js');
        const client = interaction.client;
        
        // Get or create the live roulette instance
        let liveRouletteInstance = client.liveRoulette;
        if (!liveRouletteInstance) {
            liveRouletteInstance = new LiveRoulette(client);
            client.liveRoulette = liveRouletteInstance;
        }
        
        // Update the timer to 60 seconds and start the session
        liveRouletteInstance.timeLeft = 60;
        liveRouletteInstance.currentMessage = message;
        
        // Store session data in the old format for compatibility
        liveRouletteSessions.set(channelId, {
            isActive: true,
            startTime: Date.now(),
            pendingBets: new Map(),
            host: interaction.user.id,
            message: message,
            bettingOpen: true
        });
        
        console.log(`🎰 Live roulette session started in channel ${channelId} by ${interaction.user.username}`);
        
        // Log session start
        const logManager = require('../utils/logManager.js');
        await logManager.sendGamblingLog(client, interaction.guild.id, {
            type: 'session_started',
            user: interaction.user,
            game: 'Live Roulette',
            channel: interaction.channel.name
        });
        
    } catch (error) {
        console.error('Error starting live roulette session:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Session Failed')
            .setDescription('Failed to start live roulette session. Please try again.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Export session map and functions for button handlers
module.exports.liveRouletteSessions = liveRouletteSessions;
module.exports.createBetModal = createBetModal;
module.exports.performSpin = performSpin;
module.exports.endLiveRouletteSession = endLiveRouletteSession;
module.exports.startLiveRouletteSession = startLiveRouletteSession;

