const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const securityManager = require('../utils/securityManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recoverykey')
        .setDescription('View your recovery key (requires password)')
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Your account password')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
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
            
            const recoveryKeyEmbed = new EmbedBuilder()
                .setColor('#f7931a')
                .setTitle('🔑 Your Recovery Key')
                .setDescription('**Keep this key safe!** You need it to recover your account.')
                .addFields(
                    {
                        name: '🔐 Recovery Key',
                        value: `\`${userSec.recoveryKey}\``,
                        inline: false
                    },
                    {
                        name: '⚠️ Security Warning',
                        value: 'Never share this key with anyone. Store it in a secure location offline.',
                        inline: false
                    },
                    {
                        name: '🔄 Reset Key',
                        value: 'Use `/resetrecovery` if you want to generate a new recovery key.',
                        inline: false
                    }
                )
                .setFooter({ text: 'This message will delete automatically for security' })
                .setTimestamp();
            
            const message = await interaction.editReply({ embeds: [recoveryKeyEmbed] });
            
            // Auto-delete the message after 30 seconds for security
            setTimeout(async () => {
                try {
                    await message.delete();
                } catch (error) {
                    console.log('Could not delete recovery key message:', error.message);
                }
            }, 30000);
            
        } catch (error) {
            console.error('Recovery key error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to retrieve recovery key. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};