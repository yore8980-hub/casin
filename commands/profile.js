const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');
const currencyConverter = require('../utils/currencyConverter.js');
const { formatLTC, formatUSD } = require('../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your casino profile and balance'),
    
    async execute(interaction) {
        // Check if interaction is too old (Discord timeout is 15 minutes)
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) { // 10 minutes safety margin
            console.log('Interaction too old, ignored');
            return;
        }
        
        await interaction.deferReply();
        
        try {
            const profile = userProfiles.getUserProfile(interaction.user.id);
            
            // Get recent deposit and withdrawal
            const recentDeposit = profile.depositHistory.slice(-1)[0];
            const recentWithdrawal = profile.withdrawalHistory.slice(-1)[0];
            
            // Try to get LTC price for reference
            let ltcPrice = null;
            try {
                const priceData = await currencyConverter.getLitecoinPrice('USD');
                ltcPrice = priceData.price;
            } catch (error) {
                console.log('Could not fetch LTC price:', error.message);
            }
            
            const profileEmbed = new EmbedBuilder()
                .setColor('#f7931a')
                .setTitle('🎰 Casino Profile')
                .setAuthor({ 
                    name: interaction.user.username, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .addFields(
                    { 
                        name: '💰 Current Balance', 
                        value: `**${formatLTC(profile.balance)} LTC**${ltcPrice ? `\n≈ $${formatUSD(profile.balance * ltcPrice)} USD` : ''}`, 
                        inline: true 
                    },
                    { 
                        name: '📊 Statistics', 
                        value: `**Deposited:** ${formatLTC(profile.totalDeposited)} LTC\n**Withdrawn:** ${formatLTC(profile.totalWithdrawn)} LTC\n**Net:** ${formatLTC(profile.totalDeposited - profile.totalWithdrawn)} LTC`, 
                        inline: true 
                    },
                    { 
                        name: '🎮 Activity', 
                        value: `**Deposits:** ${profile.depositHistory.length}\n**Withdrawals:** ${profile.withdrawalHistory.length}\n**Games Played:** ${profile.gameHistory.length}`, 
                        inline: true 
                    }
                )
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setFooter({ 
                    text: `Member since ${new Date(profile.createdAt).toLocaleDateString()}` 
                })
                .setTimestamp();
            
            // Add recent activity if available
            if (recentDeposit || recentWithdrawal) {
                let recentActivity = '';
                
                if (recentDeposit) {
                    const depositDate = new Date(recentDeposit.timestamp).toLocaleDateString();
                    recentActivity += `📥 **Last Deposit:** ${formatLTC(recentDeposit.amount)} LTC (${depositDate})\n`;
                }
                
                if (recentWithdrawal) {
                    const withdrawalDate = new Date(recentWithdrawal.timestamp).toLocaleDateString();
                    recentActivity += `📤 **Last Withdrawal:** ${formatLTC(recentWithdrawal.amount)} LTC (${withdrawalDate})`;
                }
                
                profileEmbed.addFields({
                    name: '📈 Recent Activity',
                    value: recentActivity,
                    inline: false
                });
            }
            
            // Add addresses count if any
            if (profile.addresses.length > 0) {
                profileEmbed.addFields({
                    name: '📍 Linked Addresses',
                    value: `${profile.addresses.length} Litecoin address(es)`,
                    inline: true
                });
            }
            
            await interaction.editReply({ embeds: [profileEmbed] });
            
        } catch (error) {
            console.error('Profile command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to load your profile. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};