const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setall')
        .setDescription('Setup complete casino server structure (Admin only)')
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
            const guild = interaction.guild;
            const config = {};
            
            // Create log category and channels
            const logCategory = await guild.channels.create({
                name: '📊-casino-logs',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });
            
            const balanceLogChannel = await guild.channels.create({
                name: '💰-balance-logs',
                type: ChannelType.GuildText,
                parent: logCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });
            
            const gamblingLogChannel = await guild.channels.create({
                name: '🎰-gambling-logs',
                type: ChannelType.GuildText,
                parent: logCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });
            
            // Create main casino category
            const casinoCategory = await guild.channels.create({
                name: '🎰-casino',
                type: ChannelType.GuildCategory
            });
            
            // Create add balance category for temporary channels
            const addBalanceCategory = await guild.channels.create({
                name: '💰-add-balance',
                type: ChannelType.GuildCategory
            });
            
            // Create public gambling category
            const publicGamblingCategory = await guild.channels.create({
                name: '🎮-public-gambling',
                type: ChannelType.GuildCategory
            });
            
            // Create add balance channel
            const addBalanceChannel = await guild.channels.create({
                name: '💰-add-balance',
                type: ChannelType.GuildText,
                parent: casinoCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
            
            // Create gambling games channel
            const gamblingChannel = await guild.channels.create({
                name: '🎰-games',
                type: ChannelType.GuildText,
                parent: casinoCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
            
            // Create private sessions channel
            const sessionChannel = await guild.channels.create({
                name: '🔒-private-sessions',
                type: ChannelType.GuildText,
                parent: casinoCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
            
            // Create terms channel
            const termsChannel = await guild.channels.create({
                name: '📋-terms-of-service',
                type: ChannelType.GuildText,
                parent: casinoCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
            
            // Create public gambling channels
            const blackjackChannel = await guild.channels.create({
                name: '🃏-blackjack',
                type: ChannelType.GuildText,
                parent: publicGamblingCategory
            });
            
            const rouletteChannel = await guild.channels.create({
                name: '🎲-roulette',
                type: ChannelType.GuildText,
                parent: publicGamblingCategory
            });
            
            const coinflipChannel = await guild.channels.create({
                name: '🪙-coinflip',
                type: ChannelType.GuildText,
                parent: publicGamblingCategory
            });
            
            const liveRouletteChannel = await guild.channels.create({
                name: '🎰-live-roulette',
                type: ChannelType.GuildText,
                parent: publicGamblingCategory,
                topic: 'Live roulette spins every 30 seconds! Join the action!'
            });
            
            // Save configuration
            config.balanceLogChannel = balanceLogChannel.id;
            config.gamblingLogChannel = gamblingLogChannel.id;
            config.balanceChannel = addBalanceChannel.id;
            config.gamblingChannel = gamblingChannel.id;
            config.sessionChannel = sessionChannel.id;
            config.termsChannel = termsChannel.id;
            config.addBalanceCategory = addBalanceCategory.id;
            config.blackjackChannel = blackjackChannel.id;
            config.rouletteChannel = rouletteChannel.id;
            config.coinflipChannel = coinflipChannel.id;
            config.liveRouletteChannel = liveRouletteChannel.id;
            
            saveServerConfig(guild.id, config);
            
            // Send terms of service
            await sendTermsOfService(termsChannel, guild);
            
            // Send panels
            await sendBalancePanel(addBalanceChannel, guild);
            await sendGamblingPanel(gamblingChannel, guild);
            await sendSessionPanel(sessionChannel, guild);
            
            // Configure log channels
            await configureLogChannels(guild.id, balanceLogChannel.id, gamblingLogChannel.id);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Server Setup Complete')
                .setDescription('Your casino server has been fully configured!')
                .addFields(
                    {
                        name: '📊 Log Channels',
                        value: `${balanceLogChannel} - Balance logs\n${gamblingLogChannel} - Gambling logs`,
                        inline: false
                    },
                    {
                        name: '🎰 Casino Channels',
                        value: `${addBalanceChannel} - Add balance\n${gamblingChannel} - Games\n${sessionChannel} - Private sessions\n${termsChannel} - Terms of service`,
                        inline: false
                    },
                    {
                        name: '⚙️ Categories Created',
                        value: `📊 Casino Logs\n🎰 Casino\n💰 Add Balance (for temp channels)`,
                        inline: false
                    },
                    {
                        name: '🔧 Next Steps',
                        value: 'Use `/whitelistpanel` to refresh panels if needed',
                        inline: false
                    }
                )
                .setFooter({ text: `Setup completed by ${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
        } catch (error) {
            console.error('Setall command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Setup Failed')
                .setDescription('Failed to setup server. Please check bot permissions and try again.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

// Helper functions
function saveServerConfig(serverId, config) {
    const path = './data/server_config.json';
    let allConfigs = {};
    
    try {
        if (fs.existsSync(path)) {
            allConfigs = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading server configs:', error);
    }
    
    allConfigs[serverId] = config;
    
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        fs.writeFileSync(path, JSON.stringify(allConfigs, null, 2));
        console.log('✅ Server configuration saved');
    } catch (error) {
        console.error('Error saving server config:', error);
    }
}

async function configureLogChannels(serverId, balanceChannelId, gamblingChannelId) {
    const path = './data/log_config.json';
    let config = {};
    
    try {
        if (fs.existsSync(path)) {
            config = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading log config:', error);
    }
    
    if (!config[serverId]) {
        config[serverId] = {};
    }
    
    config[serverId].balanceLogChannel = balanceChannelId;
    config[serverId].gamblingLogChannel = gamblingChannelId;
    
    try {
        fs.writeFileSync(path, JSON.stringify(config, null, 2));
        console.log('✅ Log configuration saved');
    } catch (error) {
        console.error('Error saving log config:', error);
    }
}

async function sendTermsOfService(channel, guild) {
    const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('📋 Terms of Service & Rules')
        .setDescription('**Please read these terms carefully before participating in our casino.**')
        .addFields(
            {
                name: '⚠️ Gambling Risks & Disclaimer',
                value: '• We are **not responsible** for any losses incurred while gambling\n• **Every bet should be considered lost** before placing it\n• Only gamble what you can **afford to lose completely**\n• Gambling involves significant risks and can be addictive\n• Set personal limits and stick to them',
                inline: false
            },
            {
                name: '🔞 Age Restrictions',
                value: '• You must be **18 years or older** to participate\n• Minors are strictly prohibited from gambling\n• Age verification may be required',
                inline: false
            },
            {
                name: '🤝 Community Rules',
                value: '• **Racism is strictly prohibited** and will result in immediate ban\n• Insults are allowed but must not be excessive or abusive\n• Respect other players and maintain a friendly environment\n• Spam and excessive toxicity will not be tolerated',
                inline: false
            },
            {
                name: '🚫 Prohibited Activities',
                value: '• **Doxxing** (sharing personal information) is forbidden\n• **Real-life threats** or intimidation will result in immediate ban\n• **IRL repercussions** or harassment outside Discord is prohibited\n• Attempting to exploit bugs or cheat will result in account suspension',
                inline: false
            },
            {
                name: '💰 Financial Responsibility',
                value: '• All transactions are final once confirmed\n• Double-check all bets before confirming\n• We are not responsible for user error or misunderstanding\n• Withdrawal limits may apply based on verification status',
                inline: false
            },
            {
                name: '⚖️ Enforcement',
                value: '• Rules are enforced at staff discretion\n• Violations may result in warnings, temporary suspension, or permanent ban\n• Appeals can be made through modmail\n• Staff decisions are final',
                inline: false
            }
        )
        .setFooter({ 
            text: `By participating, you agree to these terms • ${guild.name} Casino`,
            iconURL: guild.iconURL() 
        })
        .setTimestamp();
    
    await channel.send({ embeds: [embed] });
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
                .setLabel('Deposit Money')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰')
        );
    
    await channel.send({ embeds: [embed], components: [button] });
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