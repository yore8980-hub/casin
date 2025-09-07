const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const securityManager = require('../utils/securityManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changepassword')
        .setDescription('Change your account password')
        .addStringOption(option =>
            option.setName('oldpassword')
                .setDescription('Your current password')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('newpassword')
                .setDescription('Your new password (minimum 6 characters)')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const oldPassword = interaction.options.getString('oldpassword');
            const newPassword = interaction.options.getString('newpassword');
            
            // Validate new password
            if (newPassword.length < 6) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Password')
                    .setDescription('New password must be at least 6 characters long.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check if user has a password set
            const userSec = securityManager.getUserSecurity(interaction.user.id);
            if (!userSec.hasPassword) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Password Set')
                    .setDescription('You need to set a password first using `/setpassword`.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Try to change password
            const success = securityManager.changeUserPassword(interaction.user.id, oldPassword, newPassword);
            
            if (!success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Wrong Password')
                    .setDescription('Your current password is incorrect.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Password Changed')
                .setDescription('Your password has been successfully changed.')
                .addFields({
                    name: '🔒 Security',
                    value: 'Your recovery key remains the same and is still valid.',
                    inline: false
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
        } catch (error) {
            console.error('Change password error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to change password. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};