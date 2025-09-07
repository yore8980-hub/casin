const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const securityManager = require('../utils/securityManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stopallactives')
        .setDescription('Stop all active deposits monitoring (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction trop ancienne, ignorée');
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Get all active deposits before clearing
            const activeDeposits = securityManager.getAllActiveDeposits();
            const activeCount = activeDeposits.length;
            
            if (activeCount === 0) {
                const noActiveEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('ℹ️ No Active Deposits')
                    .setDescription('There are no active deposits to stop.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [noActiveEmbed] });
                return;
            }
            
            // Clear all active deposits
            const success = securityManager.clearAllActiveDeposits();
            
            if (success) {
                // Stop monitoring
                const { stopSmartMonitoring } = require('../discord-bot.js');
                stopSmartMonitoring();
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ All Active Deposits Stopped')
                    .setDescription(`Successfully stopped monitoring for **${activeCount}** active deposit(s).`)
                    .addFields(
                        {
                            name: '🛑 Actions Taken',
                            value: '• All active deposits cleared\n• Smart monitoring stopped\n• Users will need to generate new addresses',
                            inline: false
                        },
                        {
                            name: '⚠️ Note',
                            value: 'Users with pending deposits will need to use `/casino` again to generate new addresses.',
                            inline: false
                        }
                    )
                    .setFooter({ text: `Executed by ${interaction.user.username}` })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [successEmbed] });
                
                console.log(`🛑 Admin ${interaction.user.username} stopped ${activeCount} active deposits`);
                
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Failed to Stop')
                    .setDescription('Failed to clear active deposits. Please try again.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
            }
            
        } catch (error) {
            console.error('Erreur stopallactives:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while stopping active deposits.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};