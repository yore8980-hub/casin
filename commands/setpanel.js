const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const panelManager = require('../utils/panelManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setpanel')
        .setDescription('Configure a casino panel in a channel')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of panel to create')
                .setRequired(true)
                .addChoices(
                    { name: '🎰 Casino Main Panel', value: 'casinoPanel' },
                    { name: '💰 Add Balance Panel', value: 'addBalancePanel' }
                )
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the panel to')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('ticket_category')
                .setDescription('Category for creating ticket channels')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName('staff_role')
                .setDescription('Staff role that can see tickets')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction too old, ignored');
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const panelType = interaction.options.getString('type');
            const channel = interaction.options.getChannel('channel');
            const ticketCategory = interaction.options.getChannel('ticket_category');
            const staffRole = interaction.options.getRole('staff_role');
            
            // Validate channel type
            if (channel.type !== 0) { // Not a text channel
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Channel')
                    .setDescription('Please select a text channel for the panel.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Validate category if provided
            if (ticketCategory && ticketCategory.type !== 4) { // Not a category
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Category')
                    .setDescription('Please select a channel category for tickets.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Save configuration
            const success = panelManager.setPanelChannel(
                panelType,
                channel.id,
                ticketCategory?.id,
                staffRole?.id
            );
            
            if (!success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Configuration Failed')
                    .setDescription('Failed to save panel configuration.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Create and send the panel
            const panelEmbed = await createPanelEmbed(panelType, interaction.guild);
            const components = await createPanelComponents(panelType);
            
            try {
                const message = await channel.send({ 
                    embeds: [panelEmbed], 
                    components: components 
                });
                
                // Save message ID
                panelManager.setPanelMessageId(panelType, message.id);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Panel Created')
                    .setDescription(`${getPanelName(panelType)} has been sent to ${channel}`)
                    .addFields(
                        {
                            name: '📋 Configuration',
                            value: `**Channel:** ${channel}\n**Ticket Category:** ${ticketCategory || 'Not set'}\n**Staff Role:** ${staffRole || 'Not set'}`,
                            inline: false
                        }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [successEmbed] });
                
            } catch (sendError) {
                console.error('Panel send error:', sendError);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Send Failed')
                    .setDescription('Failed to send panel to channel. Check bot permissions.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
            }
            
        } catch (error) {
            console.error('Setpanel error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to configure panel.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Create panel embed based on type
 */
async function createPanelEmbed(panelType, guild) {
    const { EmbedBuilder } = require('discord.js');
    
    if (panelType === 'casinoPanel') {
        return new EmbedBuilder()
            .setColor('#f7931a')
            .setTitle('🎰 Welcome to the Casino!')
            .setDescription('Click the buttons below to start your casino experience.')
            .addFields(
                {
                    name: '💰 Add Balance',
                    value: 'Generate a unique Litecoin address for deposits',
                    inline: true
                },
                {
                    name: '👤 View Profile',
                    value: 'Check your balance and casino statistics',
                    inline: true
                },
                {
                    name: '🏆 Leaderboard',
                    value: 'See the top players and rankings',
                    inline: true
                },
                {
                    name: '🎮 Games Available Soon',
                    value: '• 🃏 Blackjack\n• 🎲 Roulette\n• 🎰 Slots',
                    inline: false
                }
            )
            .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
            .setFooter({ 
                text: `${guild.name} Casino • Powered by Litecoin`,
                iconURL: guild.iconURL() 
            })
            .setTimestamp();
    }
    
    if (panelType === 'addBalancePanel') {
        return new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('💰 Add Balance to Your Casino Account')
            .setDescription('Click the button below to get a unique deposit address and start playing!')
            .addFields(
                {
                    name: '⚡ Instant Detection',
                    value: 'Deposits are detected within 30 seconds',
                    inline: true
                },
                {
                    name: '🔒 Secure',
                    value: 'Each deposit gets a unique address',
                    inline: true
                },
                {
                    name: '📈 Minimum Deposit',
                    value: '0.001 LTC',
                    inline: true
                }
            )
            .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
            .setFooter({ 
                text: `${guild.name} Casino • Safe & Secure`,
                iconURL: guild.iconURL() 
            })
            .setTimestamp();
    }
}

/**
 * Create panel components based on type
 */
async function createPanelComponents(panelType) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    if (panelType === 'casinoPanel') {
        return [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_add_balance')
                        .setLabel('💰 Add Balance')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰'),
                    new ButtonBuilder()
                        .setCustomId('panel_view_profile')
                        .setLabel('👤 View Profile')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👤'),
                    new ButtonBuilder()
                        .setCustomId('panel_leaderboard')
                        .setLabel('🏆 Leaderboard')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏆')
                ),
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_games_blackjack')
                        .setLabel('🃏 Blackjack')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🃏')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('panel_games_roulette')
                        .setLabel('🎲 Roulette')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🎲')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('panel_games_slots')
                        .setLabel('🎰 Slots')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🎰')
                        .setDisabled(true)
                )
        ];
    }
    
    if (panelType === 'addBalancePanel') {
        return [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_add_balance')
                        .setLabel('💰 Get Deposit Address')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰')
                )
        ];
    }
    
    return [];
}

/**
 * Get friendly panel name
 */
function getPanelName(panelType) {
    const names = {
        'casinoPanel': '🎰 Casino Main Panel',
        'addBalancePanel': '💰 Add Balance Panel'
    };
    return names[panelType] || panelType;
}