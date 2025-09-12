const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const securityManager = require('../utils/securityManager.js');
const userProfiles = require('../utils/userProfiles.js');
const treasuryManager = require('../utils/treasuryManager.js');

// Active coinflip sessions for progression system
const activeSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Play coin flip - Choose heads or tails and double your bet!')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet in LTC')
                .setRequired(true)
                .setMinValue(0.001)
                .setMaxValue(10)
        )
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Choose heads, tails, or random')
                .setRequired(true)
                .addChoices(
                    { name: '🦅 Heads', value: 'heads' },
                    { name: '⚡ Tails', value: 'tails' },
                    { name: '🎲 Random Side', value: 'random' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        try {
            const amount = interaction.options.getNumber('amount');
            let playerChoice = interaction.options.getString('choice');
            const userId = interaction.user.id;
            
            // Handle random choice
            if (playerChoice === 'random') {
                playerChoice = Math.random() < 0.5 ? 'heads' : 'tails';
            }

            // Check if user has active gambling session
            if (!securityManager.hasActiveGamblingSession(userId)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🔒 No Active Session')
                    .setDescription('You need to enable a gambling session first using `/enable`.')
                    .addFields({
                        name: '🎮 How to Start',
                        value: 'Use `/enable [minutes] [password]` to start a gambling session.',
                        inline: false
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Check treasury bet limits
            const maxBet = treasuryManager.getMaxBetLimit();
            if (amount > maxBet) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Bet Too High')
                    .setDescription(`Maximum bet allowed is ${maxBet.toFixed(8)} LTC (30% of casino funds).`)
                    .addFields({
                        name: '💰 Current Limits',
                        value: `**Your bet:** ${amount.toFixed(8)} LTC\n**Maximum allowed:** ${maxBet.toFixed(8)} LTC\n**Casino funds:** ${treasuryManager.getCurrentBalance().toFixed(8)} LTC`,
                        inline: false
                    })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Check user balance
            const profile = userProfiles.getUserProfile(userId);
            if (profile.balance < amount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Insufficient Balance')
                    .setDescription('You don\'t have enough balance to place this bet.')
                    .addFields({
                        name: '💰 Available Balance',
                        value: `${profile.balance.toFixed(8)} LTC`,
                        inline: true
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Deduct bet amount upfront
            userProfiles.updateUserProfile(userId, { 
                balance: profile.balance - amount 
            });

            // Show coinflip animation
            await this.showCoinflipAnimation(interaction, amount, playerChoice);


        } catch (error) {
            console.error('Coin flip error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Game Error')
                .setDescription('An error occurred during the coin flip. Please try again.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    // Animation function for coinflip
    async showCoinflipAnimation(interaction, amount, playerChoice) {
        const userId = interaction.user.id;
        
        // Step 1: Show betting summary
        const bettingEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('🪙 Coinflip - Pari Lancé!')
            .setDescription(`**Mise:** ${amount.toFixed(8)} LTC`)
            .addFields(
                { name: '🎯 Votre Choix', value: playerChoice === 'heads' ? '🦅 Pile' : '⚡ Face', inline: true },
                { name: '🎲 Statut', value: 'Lancement de la pièce...', inline: true }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [bettingEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 2: Coin spinning animation
        const spinningEmbed = new EmbedBuilder()
            .setColor('#e67e22')
            .setTitle('🪙 La Pièce Tourne!')
            .setDescription('🌀 **SPIN EN COURS** 🌀')
            .setImage('https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif')
            .addFields(
                { name: '🎲 Animation', value: 'La pièce tourne dans les airs...', inline: false }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [spinningEmbed] });
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Step 3: Coin slowing down
        const slowingEmbed = new EmbedBuilder()
            .setColor('#d35400')
            .setTitle('🪙 La Pièce Ralentit!')
            .setDescription('⏳ **PRESQUE FINI** ⏳')
            .setImage('https://media.giphy.com/media/l0ErFafpUCQTQFMSk/giphy.gif')
            .addFields(
                { name: '🎯 Statut', value: 'La pièce va bientôt atterrir...', inline: false }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [slowingEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Step 4: Generate result and show final result
        const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = playerChoice === coinResult;
        
        // Handle progression system
        let currentSession = activeSessions.get(userId);
        if (!currentSession) {
            currentSession = {
                currentBet: amount,
                totalWinnings: 0,
                streak: 0,
                canCashout: false,
                lastChoice: playerChoice
            };
        }
        
        // Update last choice
        currentSession.lastChoice = playerChoice;
        
        if (won) {
            const winAmount = currentSession.currentBet * 2;
            currentSession.totalWinnings += winAmount;
            currentSession.currentBet = winAmount; // Double for next round
            currentSession.streak++;
            currentSession.canCashout = true;
            
            // Don't credit balance yet - keep in session until cashout
            activeSessions.set(userId, currentSession);
            
            // Record treasury transaction
            treasuryManager.recordPayout(amount, userId, 'coinflip', {
                originalAmount: amount,
                winAmount: winAmount,
                choice: playerChoice,
                result: coinResult
            });
        } else {
            // Lost - reset session (bet already deducted)
            activeSessions.delete(userId);
            
            // Record house win
            treasuryManager.recordHouseWin(amount, userId, 'coinflip', {
                lostAmount: amount,
                choice: playerChoice,
                result: coinResult
            });
        }
        
        // Add wagered amount
        securityManager.addWageredAmount(userId, amount);
        
        // Create result embed
        const resultEmbed = this.createProgressionResultEmbed(interaction.user, amount, playerChoice, coinResult, won, currentSession);
        const actionButtons = won ? this.createProgressionButtons(currentSession) : null;
        
        await interaction.editReply({
            embeds: [resultEmbed],
            components: actionButtons ? [actionButtons] : []
        });
        
        console.log(`🪙 ${interaction.user.username} played coinflip: ${playerChoice} vs ${coinResult} - ${won ? 'WON' : 'LOST'} ${amount.toFixed(8)} LTC`);
    },

    createProgressionResultEmbed(user, betAmount, playerChoice, coinResult, won, session) {
        const resultEmbed = new EmbedBuilder()
            .setColor(won ? '#27ae60' : '#e74c3c')
            .setTitle(won ? '🎉 GAGNÉ!' : '💔 PERDU!')
            .setDescription(`**${user.username}** a choisi **${playerChoice === 'heads' ? '🦅 Pile' : '⚡ Face'}**`)
            .addFields(
                {
                    name: '🎯 Résultat',
                    value: `**La pièce est tombée sur:** ${coinResult === 'heads' ? '🦅 **PILE**' : '⚡ **FACE**'}\\n**Votre choix:** ${playerChoice === 'heads' ? '🦅 Pile' : '⚡ Face'}\\n**Résultat:** ${won ? '🎉 **VICTOIRE!**' : '💔 **DÉFAITE**'}`,
                    inline: false
                }
            )
            .setTimestamp();
        
        if (won) {
            resultEmbed.addFields(
                {
                    name: '💰 Gains',
                    value: `**Mise:** ${betAmount.toFixed(8)} LTC\\n**Gains:** ${(betAmount * 2).toFixed(8)} LTC\\n**Série:** ${session.streak} victoire(s)`,
                    inline: true
                },
                {
                    name: '🚀 Prochaine Mise',
                    value: `**Double ou Rien:** ${session.currentBet.toFixed(8)} LTC\\n**Gains totaux:** ${session.totalWinnings.toFixed(8)} LTC`,
                    inline: true
                }
            );
            
            // Add celebration GIF for wins
            resultEmbed.setImage('https://media.giphy.com/media/g9582DNuQppxC/giphy.gif');
        } else {
            resultEmbed.addFields(
                {
                    name: '💸 Pertes',
                    value: `**Mise perdue:** ${betAmount.toFixed(8)} LTC\\n**Série interrompue**`,
                    inline: false
                }
            );
            
            // Add sad GIF for losses
            resultEmbed.setImage('https://media.giphy.com/media/l2Je66zG6mAAZxgqI/giphy.gif');
        }
        
        // Add balance info
        const profile = userProfiles.getUserProfile(user.id);
        resultEmbed.addFields({
            name: '💳 Solde Actuel',
            value: `${profile.balance.toFixed(8)} LTC`,
            inline: true
        });
        
        return resultEmbed;
    },

    createProgressionButtons(session) {
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`coinflip_double_${session.currentBet}`)
                    .setLabel(`🎲 Double ou Rien (${session.currentBet.toFixed(8)} LTC)`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🎲'),
                new ButtonBuilder()
                    .setCustomId('coinflip_cashout')
                    .setLabel(`💰 Encaisser (${session.totalWinnings.toFixed(8)} LTC)`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰')
            );
        
        return actionRow;
    },

    createGameActionButtons(balance, canCashout) {
        if (balance < 0.001) return null;

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('coinflip_again_small')
                    .setLabel('🪙 Flip Again (0.001)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🪙'),
                new ButtonBuilder()
                    .setCustomId('coinflip_again_medium')
                    .setLabel('🎯 Medium Bet (0.01)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎯')
                    .setDisabled(balance < 0.01),
                new ButtonBuilder()
                    .setCustomId('coinflip_again_big')
                    .setLabel('💎 High Roller (0.1)')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💎')
                    .setDisabled(balance < 0.1)
            );

        if (canCashout) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('quick_cashout')
                    .setLabel('💰 Cashout')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰')
            );
        }

        return actionRow;
    }
};

// Export activeSessions for button handlers
module.exports.activeSessions = activeSessions;