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
        .setDescription('🎰 Play Roulette - place your bets!')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet in LTC')
                .setRequired(true)
                .setMinValue(0.001)
        )
        .addStringOption(option =>
            option.setName('couleur')
                .setDescription('Bet on color: rouge or noir')
                .addChoices(
                    { name: '🔴 Rouge (Red)', value: 'red' },
                    { name: '⚫ Noir (Black)', value: 'black' }
                )
        )
        .addStringOption(option =>
            option.setName('numeros')
                .setDescription('Numbers to bet on (1-36, separated by spaces)')
        )
        .addStringOption(option =>
            option.setName('range')
                .setDescription('Number range to bet on')
                .addChoices(
                    { name: '1-18 (Low)', value: 'low' },
                    { name: '19-36 (High)', value: 'high' }
                )
        )
        .addStringOption(option =>
            option.setName('colonne')
                .setDescription('Column to bet on')
                .addChoices(
                    { name: '1-12 (First Column)', value: 'col1' },
                    { name: '13-24 (Second Column)', value: 'col2' },
                    { name: '25-36 (Third Column)', value: 'col3' }
                )
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        
        try {
            const bet = interaction.options.getNumber('bet');
            const couleur = interaction.options.getString('couleur');
            const numerosStr = interaction.options.getString('numeros');
            const range = interaction.options.getString('range');
            const colonne = interaction.options.getString('colonne');
            const userId = interaction.user.id;
            
            // Validate that at least one betting option is provided
            if (!couleur && !numerosStr && !range && !colonne) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Aucun Pari Sélectionné')
                    .setDescription('Vous devez sélectionner au moins une option de pari :')
                    .addFields(
                        { name: '🎯 Options Disponibles', value: '• **Couleur**: Rouge ou Noir\n• **Numéros**: 1-36 (séparés par des espaces)\n• **Range**: 1-18 ou 19-36\n• **Colonne**: 1-12, 13-24 ou 25-36', inline: false }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Parse and validate numbers
            let numbers = [];
            if (numerosStr) {
                const numArray = numerosStr.split(' ').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                const invalidNums = numArray.filter(n => n < 1 || n > 36);
                if (invalidNums.length > 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Numéros Invalides')
                        .setDescription(`Les numéros doivent être entre 1 et 36. Numéros invalides: ${invalidNums.join(', ')}`)
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [errorEmbed] });
                    return;
                }
                numbers = [...new Set(numArray)]; // Remove duplicates
            }
            
            // Remove impossible validation - users can only select one color option
            // The validation (couleur === 'red' && couleur === 'black') is impossible
            // since couleur can only have one value at a time
            
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
            
            // Calculate total bet amount
            let totalBetAmount = 0;
            const bets = new Map();
            
            if (couleur) {
                bets.set(couleur, bet);
                totalBetAmount += bet;
            }
            if (numbers.length > 0) {
                numbers.forEach(num => {
                    bets.set(`number_${num}`, bet);
                    totalBetAmount += bet;
                });
            }
            if (range) {
                bets.set(range, bet);
                totalBetAmount += bet;
            }
            if (colonne) {
                bets.set(colonne, bet);
                totalBetAmount += bet;
            }
            
            if (profile.balance < totalBetAmount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Solde Insuffisant')
                    .setDescription(`Vous avez besoin de **${formatLTC(totalBetAmount)} LTC** pour tous vos paris mais vous n'avez que **${formatLTC(profile.balance)} LTC**.`)
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
            
            // Deduct bet from balance
            userProfiles.updateUserProfile(userId, { 
                balance: profile.balance - totalBetAmount 
            });
            
            // Add wagered amount
            securityManager.addWageredAmount(userId, totalBetAmount);
            
            // Show spinning animation
            await showSpinningAnimation(interaction, bets, totalBetAmount);
            
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

function spinWheel() {
    return Math.floor(Math.random() * 37);
}

// Spinning animation function
async function showSpinningAnimation(interaction, bets, totalBetAmount) {
    const user = interaction.user;
    
    // Step 1: Show betting summary
    const bettingEmbed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('🎰 Roulette - Paris Confirmés!')
        .setDescription(formatBetsDisplay(bets))
        .addFields(
            { name: '💰 Mise Totale', value: `${formatLTC(totalBetAmount)} LTC`, inline: true },
            { name: '🎯 Statut', value: 'Préparation du spin...', inline: true }
        )
        .setTimestamp();
    
    await interaction.editReply({ embeds: [bettingEmbed] });
    
    // Step 2: Spinning animation phases
    const spinningEmbed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('🎰 La Roulette Tourne!')
        .setDescription('🌀 **SPIN EN COURS** 🌀')
        .setImage('https://media.giphy.com/media/3oriO13KTkzPwTykp2/giphy.gif')
        .addFields(
            { name: '🎲 Animation', value: 'La bille tourne autour de la roulette...', inline: false }
        )
        .setTimestamp();
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    await interaction.editReply({ embeds: [spinningEmbed] });
    
    // Step 3: Show slowing down
    const slowingEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🎰 La Bille Ralentit!')
        .setDescription('⏳ **PRESQUE FINI** ⏳')
        .setImage('https://media.giphy.com/media/l0ErFafpUCQTQFMSk/giphy.gif')
        .addFields(
            { name: '🎯 Statut', value: 'La bille va bientôt s\'arrêter...', inline: false }
        )
        .setTimestamp();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await interaction.editReply({ embeds: [slowingEmbed] });
    
    // Step 4: Generate result and show final result
    const result = spinWheel();
    const { totalPayout, winningBets } = calculatePayout(bets, result);
    
    // Update user balance with winnings
    if (totalPayout > 0) {
        const profile = userProfiles.getUserProfile(user.id);
        userProfiles.updateUserProfile(user.id, { 
            balance: profile.balance + totalPayout 
        });
    }
    
    // Log the game
    await logManager.sendGamblingLog(interaction.client, interaction.guild.id, {
        type: 'roulette',
        user: user,
        game: 'roulette',
        bet: totalBetAmount,
        result: totalPayout > 0 ? 'win' : 'lose',
        payout: totalPayout,
        details: `Résultat: ${result} ${wheel[result] === 'red' ? '🔴' : wheel[result] === 'black' ? '⚫' : '🟢'}, Paris: ${Array.from(bets.keys()).join(', ')}`
    });
    
    // Create final result embed
    const finalResultEmbed = createAnimatedResultEmbed(bets, result, totalPayout, winningBets, user, totalBetAmount);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await interaction.editReply({ embeds: [finalResultEmbed] });
}

function formatBetsDisplay(bets) {
    let display = '**Vos Paris:**\n';
    for (const [betType, amount] of bets) {
        let betName = betType;
        if (betType === 'red') betName = '🔴 Rouge';
        else if (betType === 'black') betName = '⚫ Noir';
        else if (betType === 'low') betName = '🔽 1-18';
        else if (betType === 'high') betName = '🔼 19-36';
        else if (betType === 'col1') betName = '📊 Colonne 1-12';
        else if (betType === 'col2') betName = '📊 Colonne 13-24';
        else if (betType === 'col3') betName = '📊 Colonne 25-36';
        else if (betType.startsWith('number_')) {
            const num = betType.split('_')[1];
            betName = `🎯 Numéro ${num}`;
        }
        display += `• **${betName}**: ${formatLTC(amount)} LTC\n`;
    }
    return display;
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
        } else if (betType === 'low' && result >= 1 && result <= 18) {
            won = true;
            multiplier = 1;
        } else if (betType === 'high' && result >= 19 && result <= 36) {
            won = true;
            multiplier = 1;
        } else if (betType === 'col1' && result >= 1 && result <= 12) {
            won = true;
            multiplier = 2; // 2:1 payout for columns
        } else if (betType === 'col2' && result >= 13 && result <= 24) {
            won = true;
            multiplier = 2;
        } else if (betType === 'col3' && result >= 25 && result <= 36) {
            won = true;
            multiplier = 2;
        }
        
        if (won) {
            const payout = amount * (multiplier + 1);
            totalPayout += payout;
            winningBets.push({ betType, amount, payout, multiplier });
        }
    }
    
    return { totalPayout, winningBets };
}

function createAnimatedResultEmbed(bets, result, totalPayout, winningBets, user, totalBetAmount) {
    const resultColor = wheel[result];
    const colorEmoji = resultColor === 'red' ? '🔴' : resultColor === 'black' ? '⚫' : '🟢';
    
    let title = '🎰 Résultat de la Roulette';
    let color = '#9932cc';
    let description = `🎯 **La bille s'est arrêtée sur le ${result}** ${colorEmoji}`;
    
    if (totalPayout > 0) {
        title = '🎉 FÉLICITATIONS ! Vous avez gagné !';
        color = '#00ff00';
        description += `\n\n💰 **Gains totaux: ${formatLTC(totalPayout)} LTC**`;
    } else {
        title = '💸 La Maison Gagne';
        color = '#ff0000';
        description += `\n\n💔 **Perdu: ${formatLTC(totalBetAmount)} LTC**`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .addFields(
            {
                name: '🎯 Numéro Gagnant',
                value: `**${result}** ${colorEmoji} (${resultColor === 'red' ? 'Rouge' : resultColor === 'black' ? 'Noir' : 'Vert'})`,
                inline: true
            }
        );
    
    // Add winning bets details
    if (winningBets.length > 0) {
        const winningBetsStr = winningBets.map(bet => {
            let betName = bet.betType;
            if (bet.betType === 'red') betName = '🔴 Rouge';
            else if (bet.betType === 'black') betName = '⚫ Noir';
            else if (bet.betType === 'low') betName = '🔽 1-18';
            else if (bet.betType === 'high') betName = '🔼 19-36';
            else if (bet.betType === 'col1') betName = '📊 Colonne 1-12';
            else if (bet.betType === 'col2') betName = '📊 Colonne 13-24';
            else if (bet.betType === 'col3') betName = '📊 Colonne 25-36';
            else if (bet.betType.startsWith('number_')) {
                const num = bet.betType.split('_')[1];
                betName = `🎯 Numéro ${num}`;
            }
            return `• **${betName}**: ${formatLTC(bet.amount)} LTC → ${formatLTC(bet.payout)} LTC (${bet.multiplier + 1}x)`;
        }).join('\n');
        
        embed.addFields({
            name: '🏆 Paris Gagnants',
            value: winningBetsStr,
            inline: false
        });
    }
    
    // Add balance info
    const profile = userProfiles.getUserProfile(user.id);
    embed.addFields({
        name: '💰 Nouveau Solde',
        value: `${formatLTC(profile.balance)} LTC`,
        inline: true
    });
    
    // Add big win gif for significant wins
    if (totalPayout > totalBetAmount * 10) {
        embed.setImage('https://media.giphy.com/media/g9582DNuQppxC/giphy.gif');
    }
    
    return embed;
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