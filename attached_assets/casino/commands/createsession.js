const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const sessionManager = require('../utils/sessionManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createsession')
        .setDescription('Create a private gaming session with friends')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of gaming session')
                .setRequired(true)
                .addChoices(
                    { name: '🎰 General Casino', value: 'general' },
                    { name: '🃏 Blackjack Tournament', value: 'blackjack' },
                    { name: '🎯 Roulette Party', value: 'roulette' },
                    { name: '🎲 High Stakes', value: 'highstakes' },
                    { name: '👥 Group Games', value: 'group' }
                )
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Session duration in minutes (15-360)')
                .setMinValue(15)
                .setMaxValue(360)
        )
        .addIntegerOption(option =>
            option.setName('maxplayers')
                .setDescription('Maximum number of players (2-20)')
                .setMinValue(2)
                .setMaxValue(20)
        )
        .addNumberOption(option =>
            option.setName('minbet')
                .setDescription('Minimum bet amount in LTC')
                .setMinValue(0.001)
                .setMaxValue(1.0)
        )
        .addNumberOption(option =>
            option.setName('maxbet')
                .setDescription('Maximum bet amount in LTC')
                .setMinValue(0.001)
                .setMaxValue(100.0)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        try {
            const sessionType = interaction.options.getString('type');
            const duration = interaction.options.getInteger('duration') || 60;
            const maxParticipants = interaction.options.getInteger('maxplayers') || 6;
            const minBet = interaction.options.getNumber('minbet') || 0.001;
            const maxBet = interaction.options.getNumber('maxbet') || 1.0;

            // Check if user is already in a session
            const existingSession = sessionManager.isUserInSession(interaction.user.id);
            if (existingSession) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Already in Session')
                    .setDescription('You are already in an active gaming session!')
                    .addFields({
                        name: '🎮 Current Session',
                        value: `**Type:** ${existingSession.sessionType}\n**Channel:** <#${existingSession.channelId}>`,
                        inline: false
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Validate bet limits
            if (minBet >= maxBet) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Invalid Bet Limits')
                    .setDescription('Minimum bet must be less than maximum bet!')
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            const options = {
                duration,
                maxParticipants,
                minBet,
                maxBet,
                isPublic: false,
                allowSpectators: true
            };

            // Create the session
            const result = await sessionManager.createPrivateSession(
                interaction.guild,
                interaction.user,
                sessionType,
                options
            );

            if (result.success) {
                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🎉 Gaming Session Created!')
                    .setDescription(`Your private ${sessionType} session has been created successfully!`)
                    .addFields(
                        {
                            name: '🏠 Your Private Room',
                            value: `${result.channel}\nClick the link to enter your session!`,
                            inline: false
                        },
                        {
                            name: '🎮 Session Details',
                            value: `**Type:** ${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}\n**Duration:** ${duration} minutes\n**Max Players:** ${maxParticipants}`,
                            inline: true
                        },
                        {
                            name: '💰 Betting Limits',
                            value: `**Min Bet:** ${minBet} LTC\n**Max Bet:** ${maxBet} LTC`,
                            inline: true
                        },
                        {
                            name: '🎯 Next Steps',
                            value: '• Invite friends to your session\n• Configure additional settings\n• Start playing games!\n• Have fun! 🎊',
                            inline: false
                        }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Session ID: ${result.session.id}` })
                    .setTimestamp();

                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('🚀 Go to Session')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/channels/${interaction.guild.id}/${result.channel.id}`)
                            .setEmoji('🚀'),
                        new ButtonBuilder()
                            .setCustomId(`session_invite_${result.session.id}`)
                            .setLabel('👥 Invite Friends')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('👥')
                    );

                await interaction.editReply({ 
                    embeds: [successEmbed],
                    components: [actionRow]
                });

                console.log(`🎮 New gaming session created by ${interaction.user.username}: ${result.session.id}`);

            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Session Creation Failed')
                    .setDescription(`Failed to create gaming session: ${result.error}`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Create session error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Unexpected Error')
                .setDescription('An error occurred while creating your gaming session. Please try again.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};