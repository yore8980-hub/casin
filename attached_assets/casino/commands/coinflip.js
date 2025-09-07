const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const securityManager = require('../utils/securityManager.js');
const userProfiles = require('../utils/userProfiles.js');
const treasuryManager = require('../utils/treasuryManager.js');

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
                .setDescription('Choose heads or tails')
                .setRequired(true)
                .addChoices(
                    { name: '🦅 Heads', value: 'heads' },
                    { name: '⚡ Tails', value: 'tails' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        try {
            const amount = interaction.options.getNumber('amount');
            const playerChoice = interaction.options.getString('choice');
            const userId = interaction.user.id;

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

            // Flip the coin
            const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = playerChoice === coinResult;
            const resultAmount = won ? amount * 2 : 0;

            // Record treasury transaction
            if (won) {
                treasuryManager.recordPayout(amount, interaction.user.id, 'coinflip', {
                    originalAmount: amount,
                    winAmount: resultAmount,
                    choice: playerChoice,
                    result: coinResult
                });
            } else {
                treasuryManager.recordHouseWin(amount, interaction.user.id, 'coinflip', {
                    lostAmount: amount,
                    choice: playerChoice,
                    result: coinResult
                });
            }

            // Update balance
            const newBalance = profile.balance - amount + resultAmount;
            userProfiles.updateUserProfile(userId, { balance: newBalance });

            // Add wagered amount
            securityManager.addWageredAmount(userId, amount);

            // Check cashout status
            const cashoutStatus = securityManager.canUserCashout(userId);

            // Create result embed with coin flip animation
            const resultEmbed = new EmbedBuilder()
                .setColor(won ? '#2ecc71' : '#e74c3c')
                .setTitle('🪙 COIN FLIP RESULT')
                .setDescription(`**${interaction.user.username}** chose **${playerChoice === 'heads' ? '🦅 Heads' : '⚡ Tails'}**`)
                .addFields(
                    {
                        name: '🎯 Game Result',
                        value: `**Coin landed on:** ${coinResult === 'heads' ? '🦅 **HEADS**' : '⚡ **TAILS**'}\n**Your choice:** ${playerChoice === 'heads' ? '🦅 Heads' : '⚡ Tails'}\n**Result:** ${won ? '🎉 **YOU WON!**' : '💔 **YOU LOST**'}`,
                        inline: false
                    },
                    {
                        name: '💰 Financial Summary',
                        value: `**Bet Amount:** ${amount.toFixed(8)} LTC\n**${won ? 'Winnings' : 'Lost'}:** ${won ? resultAmount.toFixed(8) : amount.toFixed(8)} LTC\n**Net Change:** ${won ? '+' : '-'}${Math.abs(resultAmount - amount).toFixed(8)} LTC`,
                        inline: true
                    },
                    {
                        name: '💳 Balance Update',
                        value: `**Previous:** ${profile.balance.toFixed(8)} LTC\n**Current:** ${newBalance.toFixed(8)} LTC`,
                        inline: true
                    },
                    {
                        name: '📊 Cashout Status',
                        value: `**Progress:** ${cashoutStatus.wageredPercent.toFixed(1)}%\n**Can Cashout:** ${cashoutStatus.canCashout ? '✅ Yes' : '❌ No'}\n**Remaining:** ${cashoutStatus.remainingToWager.toFixed(8)} LTC`,
                        inline: false
                    }
                )
                .setThumbnail(coinResult === 'heads' ? 
                    'https://media.giphy.com/media/l0ErFafpUCQTQFMSk/giphy.gif' : 
                    'https://media.giphy.com/media/l0ErYcNCCW3V3pnig/giphy.gif'
                )
                .setFooter({ 
                    text: `🪙 ${won ? 'Lucky flip!' : 'Better luck next time!'} • Casino Bot`,
                    iconURL: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png'
                })
                .setTimestamp();

            // Add special effects for big wins
            if (won && amount >= 0.01) {
                resultEmbed.setImage('https://media.giphy.com/media/g9582DNuQppxC/giphy.gif');
            }

            // Create action buttons for continuing play
            const actionRow = this.createGameActionButtons(newBalance, cashoutStatus.canCashout);

            await interaction.editReply({
                embeds: [resultEmbed],
                components: actionRow ? [actionRow] : []
            });

            console.log(`🪙 ${interaction.user.username} played coinflip: ${playerChoice} vs ${coinResult} - ${won ? 'WON' : 'LOST'} ${amount.toFixed(8)} LTC`);

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