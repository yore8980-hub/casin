const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/log_config.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadLogConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading log config:', error.message);
    }
    return {};
}

function saveLogConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('✅ Log config saved');
    } catch (error) {
        console.error('Error saving log config:', error.message);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setloggamble')
        .setDescription('Configure gambling log channel (Admin only)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send gambling logs to')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
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
            const channel = interaction.options.getChannel('channel');
            const serverId = interaction.guild.id;
            
            // Load config
            const config = loadLogConfig();
            
            if (!config[serverId]) {
                config[serverId] = {};
            }
            
            config[serverId].gamblingLogChannel = channel.id;
            
            // Save config
            saveLogConfig(config);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Gambling Log Channel Set')
                .setDescription(`Gambling logs will now be sent to ${channel}`)
                .addFields(
                    {
                        name: '📋 Configuration Details',
                        value: `**Channel:** ${channel}\n**Channel ID:** \`${channel.id}\`\n**Server:** ${interaction.guild.name}`,
                        inline: false
                    },
                    {
                        name: '🎰 What gets logged',
                        value: '• Blackjack games and results\n• Roulette spins and payouts\n• Big wins and losses\n• Suspicious gambling patterns',
                        inline: false
                    }
                )
                .setFooter({ text: `Configured by ${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Send test message to the log channel
            try {
                const testEmbed = new EmbedBuilder()
                    .setColor('#9932cc')
                    .setTitle('🎰 Gambling Log Channel Configured')
                    .setDescription('This channel has been set up to receive gambling logs from the casino bot.')
                    .addFields(
                        {
                            name: '⚙️ Configured by',
                            value: `${interaction.user} (${interaction.user.username})`,
                            inline: false
                        }
                    )
                    .setTimestamp();
                
                await channel.send({ embeds: [testEmbed] });
            } catch (channelError) {
                console.log('Could not send test message to gambling log channel:', channelError.message);
            }
            
            console.log(`🎰 Gambling log channel set to ${channel.name} for server ${interaction.guild.name}`);
            
        } catch (error) {
            console.error('Erreur setloggamble:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while setting the gambling log channel.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};