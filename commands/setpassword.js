const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const securityManager = require('../utils/securityManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setpassword')
        .setDescription('Set your account password (required for security features)')
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Your new password (minimum 6 characters)')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const password = interaction.options.getString('password');
            
            // Validate password
            if (password.length < 6) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Password')
                    .setDescription('Password must be at least 6 characters long.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check if user already has a password
            const userSec = securityManager.getUserSecurity(interaction.user.id);
            if (userSec.hasPassword) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Password Already Set')
                    .setDescription('You already have a password set. Use `/changepassword` to change it.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Set password and generate recovery key
            const recoveryKey = securityManager.setUserPassword(interaction.user.id, password);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔒 Password Set Successfully')
                .setDescription('Your password has been set and your recovery key has been generated.')
                .addFields(
                    {
                        name: '🔑 Recovery Key',
                        value: `\`${recoveryKey}\``,
                        inline: false
                    },
                    {
                        name: '⚠️ IMPORTANT',
                        value: '**Save this recovery key immediately!** You need it to recover your account if you lose access. Store it in a safe place.',
                        inline: false
                    },
                    {
                        name: '🛡️ Security Features Unlocked',
                        value: '• View recovery key with password\n• Enable gambling sessions\n• Secure cashout protection\n• Account recovery',
                        inline: false
                    }
                )
                .setThumbnail('https://em-content.zobj.net/thumbs/120/twitter/351/locked_1f512.png')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
        } catch (error) {
            console.error('Set password error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to set password. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};