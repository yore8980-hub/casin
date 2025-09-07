const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const securityManager = require('../utils/securityManager.js');
const userProfiles = require('../utils/userProfiles.js');
const ltcWallet = require('../litecoin-casino-bot.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cashout')
        .setDescription('Withdraw your LTC balance (requires password and 100% wagering)')
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Your LTC address to withdraw to')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to withdraw in LTC')
                .setRequired(true)
                .setMinValue(0.001)
        )
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Your account password')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const toAddress = interaction.options.getString('address');
            const amount = interaction.options.getNumber('amount');
            const password = interaction.options.getString('password');
            const userId = interaction.user.id;
            
            // Check if user has a password set
            const userSec = securityManager.getUserSecurity(userId);
            if (!userSec.hasPassword) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Password Set')
                    .setDescription('You need to set a password first using `/setpassword` to cashout.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Verify password
            if (!securityManager.verifyUserPassword(userId, password)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Wrong Password')
                    .setDescription('The password you entered is incorrect.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check cashout eligibility (100% wagering requirement)
            const cashoutStatus = securityManager.canUserCashout(userId);
            
            if (!cashoutStatus.canCashout) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Cashout Not Allowed')
                    .setDescription('You must wager at least 100% of your deposited amount before cashing out.')
                    .addFields(
                        {
                            name: '📊 Wagering Status',
                            value: `**Deposited:** ${cashoutStatus.depositedAmount.toFixed(8)} LTC\n**Wagered:** ${cashoutStatus.wageredAmount.toFixed(8)} LTC\n**Progress:** ${cashoutStatus.wageredPercent.toFixed(1)}%`,
                            inline: true
                        },
                        {
                            name: '🎯 Remaining to Wager',
                            value: `${cashoutStatus.remainingToWager.toFixed(8)} LTC`,
                            inline: true
                        },
                        {
                            name: '💡 How to Unlock Cashout',
                            value: 'Play casino games to increase your wagered amount to 100% of deposits.',
                            inline: false
                        }
                    )
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
                    .setDescription(`You don't have enough balance to withdraw.`)
                    .addFields({
                        name: '💰 Available Balance',
                        value: `${profile.balance.toFixed(8)} LTC`,
                        inline: true
                    })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Find a source address with sufficient balance
            const addresses = ltcWallet.loadAddresses();
            let fromAddress = null;
            
            for (const addr of addresses) {
                if (addr.balance >= amount) {
                    fromAddress = addr.address;
                    break;
                }
            }
            
            if (!fromAddress) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Suitable Address')
                    .setDescription('No address found with sufficient balance for withdrawal.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Process withdrawal
            const processingEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⏳ Processing Withdrawal')
                .setDescription('Your withdrawal is being processed...')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [processingEmbed] });
            
            // Execute withdrawal
            const txid = await ltcWallet.withdraw(fromAddress, toAddress, amount);
            
            if (!txid) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Withdrawal Failed')
                    .setDescription('Failed to process withdrawal. Please try again or contact support.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Update user profile
            userProfiles.addWithdrawal(userId, amount, toAddress, txid);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Withdrawal Successful')
                .setDescription('Your withdrawal has been processed and broadcasted to the Litecoin network.')
                .addFields(
                    {
                        name: '💰 Amount',
                        value: `${amount.toFixed(8)} LTC`,
                        inline: true
                    },
                    {
                        name: '📍 Destination',
                        value: `\`${toAddress}\``,
                        inline: false
                    },
                    {
                        name: '🔗 Transaction ID',
                        value: `\`${txid}\``,
                        inline: false
                    },
                    {
                        name: '⏰ Status',
                        value: 'Transaction broadcasted - confirmations pending',
                        inline: false
                    }
                )
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            console.log(`💸 Processed withdrawal: ${amount} LTC for user ${interaction.user.username} - TXID: ${txid}`);
            
        } catch (error) {
            console.error('Cashout error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Cashout Error')
                .setDescription('An error occurred while processing your withdrawal. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};