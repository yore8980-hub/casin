const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');
const currencyConverter = require('../utils/currencyConverter.js');
const { formatLTC, formatUSD } = require('../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance for (optional)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction trop ancienne, ignorée');
            return;
        }
        
        await interaction.deferReply();
        
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const profile = userProfiles.getUserProfile(targetUser.id);
            
            // Get LTC price for USD conversion
            let ltcPrice = null;
            let eurPrice = null;
            
            try {
                const [usdData, eurData] = await Promise.all([
                    currencyConverter.getLitecoinPrice('USD'),
                    currencyConverter.getLitecoinPrice('EUR')
                ]);
                ltcPrice = usdData.price;
                eurPrice = eurData.price;
            } catch (error) {
                console.log('Could not fetch crypto prices:', error.message);
            }
            
            const balanceEmbed = new EmbedBuilder()
                .setColor('#f7931a')
                .setTitle('💰 Balance Information')
                .setAuthor({ 
                    name: targetUser.username, 
                    iconURL: targetUser.displayAvatarURL() 
                })
                .addFields({
                    name: '🪙 Litecoin Balance',
                    value: `**${formatLTC(profile.balance)} LTC**`,
                    inline: false
                })
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setTimestamp();
            
            // Add USD and EUR conversions if available
            if (ltcPrice && eurPrice) {
                const usdValue = profile.balance * ltcPrice;
                const eurValue = profile.balance * eurPrice;
                
                balanceEmbed.addFields(
                    {
                        name: '💵 USD Equivalent',
                        value: `$${formatUSD(usdValue)}`,
                        inline: true
                    },
                    {
                        name: '💶 EUR Equivalent',
                        value: `€${formatUSD(eurValue)}`,
                        inline: true
                    }
                );
            }
            
            // Add quick stats
            if (profile.depositHistory.length > 0 || profile.withdrawalHistory.length > 0) {
                balanceEmbed.addFields({
                    name: '📊 Quick Stats',
                    value: `**Total Deposited:** ${formatLTC(profile.totalDeposited)} LTC\n**Total Withdrawn:** ${formatLTC(profile.totalWithdrawn)} LTC\n**Net Gain/Loss:** ${formatLTC(profile.totalDeposited - profile.totalWithdrawn - profile.balance)} LTC`,
                    inline: false
                });
            }
            
            // Check if viewing someone else's balance
            if (targetUser.id !== interaction.user.id) {
                balanceEmbed.setFooter({ text: `Balance requested by ${interaction.user.username}` });
            }
            
            await interaction.editReply({ embeds: [balanceEmbed] });
            
        } catch (error) {
            console.error('Balance command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to fetch balance information. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};