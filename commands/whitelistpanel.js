const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelistpanel')
        .setDescription('Send panels to configured channels (Admin only)')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of panel to send')
                .setRequired(true)
                .addChoices(
                    { name: '🎰 Gambling Panel', value: 'gambling' },
                    { name: '💰 Add Balance Panel', value: 'balance' },
                    { name: '🔒 Private Session Panel', value: 'session' }
                )
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
            const config = loadPanelConfig();
            
            let sent = false;
            let targetChannel = null;
            
            if (panelType === 'gambling' && config.gamblingChannel) {
                targetChannel = await interaction.guild.channels.fetch(config.gamblingChannel);
                if (targetChannel) {
                    await sendGamblingPanel(targetChannel, interaction.guild);
                    sent = true;
                }
            } else if (panelType === 'balance' && config.balanceChannel) {
                targetChannel = await interaction.guild.channels.fetch(config.balanceChannel);
                if (targetChannel) {
                    await sendBalancePanel(targetChannel, interaction.guild);
                    sent = true;
                }
            } else if (panelType === 'session' && config.sessionChannel) {
                targetChannel = await interaction.guild.channels.fetch(config.sessionChannel);
                if (targetChannel) {
                    await sendSessionPanel(targetChannel, interaction.guild);
                    sent = true;
                }
            }
            
            const responseEmbed = new EmbedBuilder()
                .setTimestamp();
            
            if (sent) {
                responseEmbed
                    .setColor('#00ff00')
                    .setTitle('✅ Panel Sent')
                    .setDescription(`${getPanelName(panelType)} has been sent to ${targetChannel}.`);
            } else {
                responseEmbed
                    .setColor('#ff9900')
                    .setTitle('⚠️ Panel Not Configured')
                    .setDescription(`No channel configured for ${getPanelName(panelType)}. Use \`/setall\` to set up channels.`);
            }
            
            await interaction.editReply({ embeds: [responseEmbed] });
            
        } catch (error) {
            console.error('Whitelistpanel command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to send panel. Please try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

// Helper functions
function loadPanelConfig() {
    const fs = require('fs');
    const path = './data/server_config.json';
    
    try {
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading panel config:', error);
    }
    
    return {};
}

function getPanelName(type) {
    const names = {
        'gambling': '🎰 Gambling Panel',
        'balance': '💰 Add Balance Panel',
        'session': '🔒 Private Session Panel'
    };
    return names[type] || type;
}

async function sendGamblingPanel(channel, guild) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const embed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('🎰 Casino Games')
        .setDescription('Welcome to our casino! Click on any game below to learn how to play.')
        .addFields(
            {
                name: '🃏 Blackjack',
                value: 'Classic card game - Beat the dealer without going over 21!',
                inline: true
            },
            {
                name: '🎲 Roulette',
                value: 'Place your bets on numbers, colors, or odds/evens!',
                inline: true
            },
            {
                name: '🪙 Coinflip',
                value: 'Simple 50/50 game - Choose heads or tails!',
                inline: true
            }
        )
        .setFooter({ 
            text: `${guild.name} Casino • Good Luck!`,
            iconURL: guild.iconURL() 
        })
        .setTimestamp();
    
    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('explain_blackjack')
                .setLabel('🃏 How to Play Blackjack')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('explain_roulette')
                .setLabel('🎲 How to Play Roulette')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('explain_coinflip')
                .setLabel('🪙 How to Play Coinflip')
                .setStyle(ButtonStyle.Primary)
        );
    
    await channel.send({ embeds: [embed], components: [buttons] });
}

async function sendBalancePanel(channel, guild) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('💰 Add Balance to Your Account')
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
    
    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('add_balance')
                .setLabel('💰 Get Deposit Address')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰')
        );
    
    await channel.send({ embeds: [embed], components: [button] });
}

async function sendSessionPanel(channel, guild) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('🔒 Private Gaming Sessions')
        .setDescription('Create private gaming sessions where only you and invited players can participate.')
        .addFields(
            {
                name: '👥 Session Features',
                value: '• Private gaming environment\n• Invite specific players\n• Control who can join\n• Enhanced privacy',
                inline: true
            },
            {
                name: '🎮 Available Games',
                value: '• Private Blackjack tables\n• Exclusive Roulette wheels\n• Coinflip tournaments\n• Custom betting limits',
                inline: true
            },
            {
                name: '⚙️ Session Management',
                value: '• Use `/createsession` to start\n• Use `/addplayer` to invite\n• Sessions auto-close after inactivity',
                inline: false
            }
        )
        .setFooter({ 
            text: `${guild.name} Casino • Private Gaming`,
            iconURL: guild.iconURL() 
        })
        .setTimestamp();
    
    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_private_session')
                .setLabel('🔒 Create Private Session')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔒')
        );
    
    await channel.send({ embeds: [embed], components: [button] });
}