const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const securityManager = require('../utils/securityManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enable')
        .setDescription('Enable gambling session with time limit (requires password)')
        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('Session duration in minutes (1-60)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(60)
        )
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Your account password')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const minutes = interaction.options.getInteger('minutes');
            const password = interaction.options.getString('password');
            
            // Check if user has a password set
            const userSec = securityManager.getUserSecurity(interaction.user.id);
            if (!userSec.hasPassword) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Password Set')
                    .setDescription('You need to set a password first using `/setpassword` to enable gambling sessions.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Verify password
            if (!securityManager.verifyUserPassword(interaction.user.id, password)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Wrong Password')
                    .setDescription('The password you entered is incorrect.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check if user already has an active session
            if (securityManager.hasActiveGamblingSession(interaction.user.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Session Already Active')
                    .setDescription('You already have an active gambling session. Wait for it to expire before starting a new one.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Start gambling session
            const endTime = securityManager.startGamblingSession(interaction.user.id, minutes);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎰 Gambling Session Enabled')
                .setDescription(`Your gambling session is now active for **${minutes} minute${minutes > 1 ? 's' : ''}**.`)
                .addFields(
                    {
                        name: '⏰ Session Details',
                        value: `**Started:** <t:${Math.floor(Date.now()/1000)}:T>\n**Ends:** <t:${Math.floor(endTime.getTime()/1000)}:T>\n**Duration:** ${minutes} minute${minutes > 1 ? 's' : ''}`,
                        inline: false
                    },
                    {
                        name: '🎮 What you can do now',
                        value: '• Play casino games\n• Place bets\n• Use gambling features\n• All protected by your session',
                        inline: true
                    },
                    {
                        name: '🔒 Security',
                        value: '• Session auto-expires\n• Password protected\n• Secure gambling environment',
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
        } catch (error) {
            console.error('Enable gambling session error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to enable gambling session. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};