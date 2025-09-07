const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const securityManager = require('../utils/securityManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetrecovery')
        .setDescription('Reset your recovery key (requires old key + password)')
        .addStringOption(option =>
            option.setName('oldkey')
                .setDescription('Your current recovery key')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Your account password')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const oldKey = interaction.options.getString('oldkey');
            const password = interaction.options.getString('password');
            
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
            
            // Try to reset recovery key
            const newRecoveryKey = securityManager.resetRecoveryKey(interaction.user.id, oldKey, password);
            
            if (!newRecoveryKey) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Reset Failed')
                    .setDescription('Invalid recovery key or password. Both must be correct to reset.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔄 Recovery Key Reset')
                .setDescription('Your recovery key has been successfully reset.')
                .addFields(
                    {
                        name: '🔑 New Recovery Key',
                        value: `\`${newRecoveryKey}\``,
                        inline: false
                    },
                    {
                        name: '⚠️ IMPORTANT',
                        value: '**Save this new recovery key immediately!** Your old key is no longer valid.',
                        inline: false
                    },
                    {
                        name: '🔒 Security',
                        value: 'Store your new recovery key in a safe place. You will need it to recover your account.',
                        inline: false
                    }
                )
                .setFooter({ text: 'This message will delete automatically for security' })
                .setTimestamp();
            
            const message = await interaction.editReply({ embeds: [successEmbed] });
            
            // Auto-delete the message after 45 seconds for security
            setTimeout(async () => {
                try {
                    await message.delete();
                } catch (error) {
                    console.log('Could not delete reset recovery message:', error.message);
                }
            }, 45000);
            
        } catch (error) {
            console.error('Reset recovery error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to reset recovery key. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};