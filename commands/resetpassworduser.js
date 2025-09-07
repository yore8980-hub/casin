const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetpassworduser')
        .setDescription('Reset password for any user (Bot Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User whose password to reset')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction too old, ignored');
            return;
        }
        
        // Check if user is bot owner
        const ownerId = process.env.OWNER_ID;
        
        if (!ownerId || interaction.user.id !== ownerId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Access Denied')
                .setDescription('Only the bot owner can reset user passwords.')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const targetUser = interaction.options.getUser('user');
            
            // Check if user has a profile
            const profile = userProfiles.getUserProfile(targetUser.id);
            if (!profile) {
                const noProfileEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ User Not Found')
                    .setDescription(`User ${targetUser.username} doesn't have a casino profile yet.`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [noProfileEmbed] });
                return;
            }
            
            // Reset password and recovery key
            const resetResult = userProfiles.resetUserSecurity(targetUser.id);
            
            if (resetResult.success) {
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Password Reset Complete')
                    .setDescription(`Successfully reset security settings for ${targetUser.username}`)
                    .addFields(
                        {
                            name: '👤 Target User',
                            value: `${targetUser.username} (${targetUser.id})`,
                            inline: false
                        },
                        {
                            name: '🔐 Actions Taken',
                            value: '• Password cleared\n• Recovery key regenerated\n• User can now set new password with `/setpassword`',
                            inline: false
                        },
                        {
                            name: '🔑 New Recovery Key',
                            value: `\`${resetResult.newRecoveryKey}\``,
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Owner command executed' })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [successEmbed] });
                
                console.log(`🔐 Owner ${interaction.user.username} reset password for user ${targetUser.username} (${targetUser.id})`);
                
                // Try to notify the user via DM (optional)
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('🔐 Password Reset by Admin')
                        .setDescription('Your casino password has been reset by an administrator.')
                        .addFields(
                            {
                                name: '📝 What to do next',
                                value: '• Use `/setpassword` to set a new password\n• Your balance and profile are safe',
                                inline: false
                            },
                            {
                                name: '🔑 Your New Recovery Key',
                                value: `\`${resetResult.newRecoveryKey}\`\n*Save this somewhere safe!*`,
                                inline: false
                            }
                        )
                        .setTimestamp();
                    
                    await targetUser.send({ embeds: [dmEmbed] });
                    console.log(`📩 Notification DM envoyée à ${targetUser.username}`);
                } catch (dmError) {
                    console.log(`⚠️ Impossible d'envoyer DM à ${targetUser.username}: ${dmError.message}`);
                }
                
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Reset Failed')
                    .setDescription('Failed to reset user password. Please try again.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
            }
            
        } catch (error) {
            console.error('Erreur resetpassworduser:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while resetting the password.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};