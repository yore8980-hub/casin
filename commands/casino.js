const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const panelManager = require('../utils/panelManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casino')
        .setDescription('Send configured casino panels to channels (Admin only)')
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
            // Get all panel configurations
            const casinoPanelConfig = panelManager.getPanelConfig('casinoPanel');
            const addBalancePanelConfig = panelManager.getPanelConfig('addBalancePanel');
            
            let sentPanels = 0;
            let errors = [];
            
            // Send casino panel if configured
            if (casinoPanelConfig && casinoPanelConfig.channelId) {
                try {
                    const channel = await interaction.guild.channels.fetch(casinoPanelConfig.channelId);
                    if (channel) {
                        const casinoPanelEmbed = await createCasinoPanelEmbed(interaction.guild);
                        const casinoPanelComponents = createCasinoPanelComponents();
                        
                        await channel.send({ 
                            embeds: [casinoPanelEmbed], 
                            components: casinoPanelComponents 
                        });
                        sentPanels++;
                    }
                } catch (error) {
                    errors.push(`Casino Panel: ${error.message}`);
                }
            }
            
            // Send add balance panel if configured
            if (addBalancePanelConfig && addBalancePanelConfig.channelId) {
                try {
                    const channel = await interaction.guild.channels.fetch(addBalancePanelConfig.channelId);
                    if (channel) {
                        const addBalancePanelEmbed = await createAddBalancePanelEmbed(interaction.guild);
                        const addBalancePanelComponents = createAddBalancePanelComponents();
                        
                        await channel.send({ 
                            embeds: [addBalancePanelEmbed], 
                            components: addBalancePanelComponents 
                        });
                        sentPanels++;
                    }
                } catch (error) {
                    errors.push(`Add Balance Panel: ${error.message}`);
                }
            }
            
            // Create response embed
            const responseEmbed = new EmbedBuilder()
                .setTimestamp();
            
            if (sentPanels > 0) {
                responseEmbed
                    .setColor('#00ff00')
                    .setTitle('✅ Casino Panels Sent')
                    .setDescription(`Successfully sent ${sentPanels} casino panel(s) to configured channels.`)
                    .addFields({
                        name: '📋 Panel Status',
                        value: `🎰 Casino Panel: ${casinoPanelConfig?.channelId ? '✅ Sent' : '❌ Not configured'}\n💰 Add Balance Panel: ${addBalancePanelConfig?.channelId ? '✅ Sent' : '❌ Not configured'}`,
                        inline: false
                    });
            } else {
                responseEmbed
                    .setColor('#ff9900')
                    .setTitle('⚠️ No Panels Configured')
                    .setDescription('No casino panels are configured. Use `/setpanel` to configure panels first.')
                    .addFields({
                        name: '🔧 How to configure',
                        value: 'Use `/setpanel` command to configure:\n• `casinoPanel` - Main casino interface\n• `addBalancePanel` - Balance deposit interface',
                        inline: false
                    });
            }
            
            if (errors.length > 0) {
                responseEmbed.addFields({
                    name: '❌ Errors',
                    value: errors.join('\n'),
                    inline: false
                });
            }
            
            await interaction.editReply({ embeds: [responseEmbed] });
            
        } catch (error) {
            console.error('Casino command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to send casino panels. Please try again.')
                .setTimestamp();
            
            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (replyError) {
                console.error('Unable to reply to casino error:', replyError.message);
            }
        }
    }
};

/**
 * Create casino panel embed
 */
async function createCasinoPanelEmbed(guild) {
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
                name: '🎮 Games Available',
                value: '• 🃏 Blackjack\n• 🎰 Roulette\n• 🎲 Slots (Coming Soon)',
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

/**
 * Create casino panel components
 */
function createCasinoPanelComponents() {
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
                    .setCustomId('casino_blackjack')
                    .setLabel('🃏 Blackjack')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🃏'),
                new ButtonBuilder()
                    .setCustomId('casino_roulette')
                    .setLabel('🎰 Roulette')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎰'),
                new ButtonBuilder()
                    .setCustomId('casino_slots')
                    .setLabel('🎲 Slots')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎲')
                    .setDisabled(true)
            )
    ];
}

/**
 * Create add balance panel embed
 */
async function createAddBalancePanelEmbed(guild) {
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

/**
 * Create add balance panel components
 */
function createAddBalancePanelComponents() {
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