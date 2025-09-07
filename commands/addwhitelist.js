const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const panelManager = require('../utils/panelManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addwhitelist')
        .setDescription('Add this server to panel management whitelist (Bot Owner only)')
        .addRoleOption(option =>
            option.setName('admin_role')
                .setDescription('Role that can manage panels (optional)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction too old, ignored');
            return;
        }
        
        // Check if user is bot owner (you can change this logic)
        const botOwnerIds = ['1409315903937449994']; // Add your user ID here
        
        if (!botOwnerIds.includes(interaction.user.id)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Access Denied')
                .setDescription('Only the bot owner can manage the whitelist.')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const adminRole = interaction.options.getRole('admin_role');
            const serverId = interaction.guild.id;
            
            // Add to whitelist
            const success = panelManager.addToWhitelist(serverId, adminRole?.id);
            
            if (success) {
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Server Whitelisted')
                    .setDescription(`Server **${interaction.guild.name}** has been added to the whitelist.`)
                    .addFields(
                        {
                            name: '🏛️ Server',
                            value: interaction.guild.name,
                            inline: true
                        },
                        {
                            name: '👑 Admin Role',
                            value: adminRole ? adminRole.name : 'None (all members can manage)',
                            inline: true
                        },
                        {
                            name: '📋 Available Commands',
                            value: '• `/setpanel` - Configure casino panels\n• `/stopallactives` - Stop active deposits',
                            inline: false
                        }
                    )
                    .setFooter({ text: `Server ID: ${serverId}` })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [successEmbed] });
                
                console.log(`✅ Serveur ${interaction.guild.name} ajouté à la whitelist par ${interaction.user.username}`);
                
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Whitelist Failed')
                    .setDescription('Failed to add server to whitelist.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
            }
            
        } catch (error) {
            console.error('Erreur addwhitelist:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while adding server to whitelist.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};