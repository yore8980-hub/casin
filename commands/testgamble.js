const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const securityManager = require('../utils/securityManager.js');
const userProfiles = require('../utils/userProfiles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testgamble')
        .setDescription('Test gambling command to simulate wagering (requires active session)')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to wager in LTC')
                .setRequired(true)
                .setMinValue(0.001)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const amount = interaction.options.getNumber('amount');
            const userId = interaction.user.id;
            
            // Check if user has active gambling session
            if (!securityManager.hasActiveGamblingSession(userId)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Active Session')
                    .setDescription('You need to enable a gambling session first using `/enable`.')
                    .addFields({
                        name: '🔒 How to Start',
                        value: 'Use `/enable [minutes] [password]` to start a gambling session.',
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
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Balance')
                    .setDescription('You don\'t have enough balance to wager this amount.')
                    .addFields({
                        name: '💰 Available Balance',
                        value: `${profile.balance.toFixed(8)} LTC`,
                        inline: true
                    })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Simulate gambling result (50/50 chance for testing)
            const won = Math.random() > 0.5;
            const resultAmount = won ? amount * 1.8 : 0; // 1.8x payout if win
            
            // Update balance
            const newBalance = profile.balance - amount + resultAmount;
            userProfiles.updateUserProfile(userId, { balance: newBalance });
            
            // Add wagered amount (for cashout protection)
            securityManager.addWageredAmount(userId, amount);
            
            // Check new cashout status
            const cashoutStatus = securityManager.canUserCashout(userId);
            
            const resultEmbed = new EmbedBuilder()
                .setColor(won ? '#00ff00' : '#ff0000')
                .setTitle(won ? '🎉 You Won!' : '💔 You Lost!')
                .setDescription(`Test gambling result: ${won ? 'WIN' : 'LOSS'}`)
                .addFields(
                    {
                        name: '🎲 Game Result',
                        value: `**Wagered:** ${amount.toFixed(8)} LTC\n**${won ? 'Won' : 'Lost'}:** ${resultAmount.toFixed(8)} LTC\n**Net:** ${(resultAmount - amount).toFixed(8)} LTC`,
                        inline: true
                    },
                    {
                        name: '💰 Balance Update',
                        value: `**Previous:** ${profile.balance.toFixed(8)} LTC\n**Current:** ${newBalance.toFixed(8)} LTC`,
                        inline: true
                    },
                    {
                        name: '📊 Cashout Status',
                        value: `**Progress:** ${cashoutStatus.wageredPercent.toFixed(1)}%\n**Can Cashout:** ${cashoutStatus.canCashout ? '✅ Yes' : '❌ No'}\n**Remaining:** ${cashoutStatus.remainingToWager.toFixed(8)} LTC`,
                        inline: false
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [resultEmbed] });
            
            console.log(`🎲 ${interaction.user.username} ${won ? 'won' : 'lost'} ${amount} LTC - Balance: ${newBalance.toFixed(8)} LTC`);
            
        } catch (error) {
            console.error('Test gamble error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Game Error')
                .setDescription('An error occurred during the game. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};