const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
                console.log(`✅ ${interaction.user.username} a utilisé /${interaction.commandName}`);
            } catch (error) {
                console.error(`❌ Erreur lors de l'exécution de ${interaction.commandName}:`, error);

                try {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Command Error')
                        .setDescription('There was an error while executing this command!')
                        .setTimestamp();

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }
                } catch (replyError) {
                    console.error('⚠️ Impossible de répondre à l\'interaction:', replyError.message);
                }
            }
        }

        // Handle button interactions
        if (interaction.isButton()) {
            try {
                // Check for panel interactions
                if (interaction.customId.startsWith('panel_')) {
                    await handlePanelInteraction(interaction);
                } else {
                    await handleButtonInteraction(interaction);
                }
            } catch (error) {
                console.error('❌ Erreur d\'interaction bouton:', error);

                try {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Error')
                        .setDescription('There was an error processing your request!')
                        .setTimestamp();

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }
                } catch (replyError) {
                    console.error('⚠️ Impossible de répondre à l\'interaction bouton:', replyError.message);
                }
            }
        }
    },
};

/**
 * Handle button interactions
 */
async function handleButtonInteraction(interaction) {
    const { customId } = interaction;
    
    switch (customId) {
        case 'add_balance':
            await handleAddBalance(interaction);
            break;
        case 'view_profile':
            await handleViewProfile(interaction);
            break;
        case 'leaderboard':
            await handleLeaderboard(interaction);
            break;
        case 'create_channel':
            await handleCreateChannel(interaction);
            break;
        case 'blackjack':
        case 'roulette':
        case 'slots':
            await handleGameNotAvailable(interaction);
            break;
        default:
            console.log(`Interaction bouton inconnue: ${customId}`);
    }
}

/**
 * Handle Add Balance button
 */
async function handleAddBalance(interaction) {
    // Avoid duplicate calls from panel interactions
    if (interaction.customId === 'panel_add_balance') {
        return; // This is handled by handlePanelInteraction
    }
    
    const { handleAddBalance } = require('../discord-bot.js');
    await handleAddBalance(interaction);
}

/**
 * Handle View Profile button
 */
async function handleViewProfile(interaction) {
    // Avoid duplicate calls from panel interactions
    if (interaction.customId === 'panel_view_profile') {
        return; // This is handled by handlePanelInteraction
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    const profileCommand = require('../commands/profile.js');
    await profileCommand.execute(interaction);
}

/**
 * Handle Leaderboard button
 */
async function handleLeaderboard(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const userProfiles = require('../utils/userProfiles.js');
        const { formatLTC } = require('../utils/formatters.js');
        const leaderboard = userProfiles.getLeaderboard('balance', 10);
        
        if (leaderboard.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🏆 Casino Leaderboard')
                .setDescription('No players yet! Be the first to add balance.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [emptyEmbed] });
            return;
        }
        
        let leaderboardText = '';
        const medals = ['🥇', '🥈', '🥉'];
        
        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const medal = i < 3 ? medals[i] : `${i + 1}.`;
            
            try {
                const discordUser = await interaction.client.users.fetch(user.userId);
                leaderboardText += `${medal} **${discordUser.username}** - ${formatLTC(user.value)} LTC\n`;
            } catch (error) {
                leaderboardText += `${medal} **Unknown User** - ${formatLTC(user.value)} LTC\n`;
            }
        }
        
        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🏆 Casino Leaderboard')
            .setDescription('**Top Players by Balance**\n\n' + leaderboardText)
            .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
            .setFooter({ text: 'Rankings update in real-time' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [leaderboardEmbed] });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to load leaderboard. Please try again.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

/**
 * Handle Create Channel button
 */
async function handleCreateChannel(interaction) {
    const { handleCreateChannel } = require('../discord-bot.js');
    await handleCreateChannel(interaction);
}

/**
 * Handle panel interactions (creates tickets)
 */
async function handlePanelInteraction(interaction) {
    // Check if interaction is too old
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 10 * 60 * 1000) {
        console.log('Interaction trop ancienne, ignorée');
        return;
    }
    
    const ticketManager = require('../utils/ticketManager.js');
    const panelManager = require('../utils/panelManager.js');
    
    const { customId } = interaction;
    
    // Determine ticket type based on button
    let ticketType = 'general';
    let actionName = 'Casino';
    
    if (customId === 'panel_add_balance') {
        ticketType = 'balance';
        actionName = 'Add Balance';
    } else if (customId === 'panel_view_profile') {
        ticketType = 'profile';
        actionName = 'Profile';
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Get panel configuration for ticket category
        const panelConfig = panelManager.getPanelConfig('casinoPanel');
        const categoryId = panelConfig?.ticketCategory;
        const staffRoleId = panelConfig?.staffRole;
        
        // Create ticket
        const result = await ticketManager.createTicket(
            interaction.guild,
            interaction.user,
            categoryId,
            staffRoleId,
            ticketType
        );
        
        if (result.success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Private Channel Created')
                .setDescription(`Your private ${actionName.toLowerCase()} channel has been created!`)
                .addFields({
                    name: '🎫 Your Channel',
                    value: `${result.channel}`,
                    inline: false
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Send welcome message in ticket
            await sendTicketWelcome(result.channel, interaction.user, ticketType);
            
        } else if (result.error === 'existing') {
            const existingEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Channel Already Exists')
                .setDescription(`You already have a private ${actionName.toLowerCase()} channel!`)
                .addFields({
                    name: '🎫 Your Existing Channel',
                    value: `${result.channel}`,
                    inline: false
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [existingEmbed] });
            
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Failed to Create Channel')
                .setDescription('Unable to create your private channel. Please contact staff.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
        
    } catch (error) {
        console.error('Erreur panel interaction:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your request.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

/**
 * Send welcome message in ticket channel
 */
async function sendTicketWelcome(channel, user, ticketType) {
    try {
        let welcomeEmbed;
        
        if (ticketType === 'balance') {
            const { handleAddBalance } = require('../discord-bot.js');
            
            welcomeEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💰 Private Balance Channel')
                .setDescription(`Welcome ${user}! This is your private channel for balance operations.`)
                .addFields(
                    {
                        name: '📋 Available Actions',
                        value: '• Click the button below to generate a deposit address\n• Check your balance with commands\n• Safe and private environment',
                        inline: false
                    }
                )
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();
            
            const balanceButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('add_balance')
                        .setLabel('💰 Generate Deposit Address')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰')
                );
            
            await channel.send({ 
                embeds: [welcomeEmbed],
                components: [balanceButton]
            });
            
        } else if (ticketType === 'profile') {
            welcomeEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('👤 Private Profile Channel')
                .setDescription(`Welcome ${user}! This is your private channel for profile management.`)
                .addFields(
                    {
                        name: '📋 Available Actions',
                        value: '• Use `/profile` to view your statistics\n• Use `/balance` to check your funds\n• Use `/givebal` to transfer to other users',
                        inline: false
                    }
                )
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();
            
            await channel.send({ embeds: [welcomeEmbed] });
            
        } else {
            welcomeEmbed = new EmbedBuilder()
                .setColor('#f7931a')
                .setTitle('🎰 Private Casino Channel')
                .setDescription(`Welcome ${user}! This is your private casino session.`)
                .addFields(
                    {
                        name: '🎮 Available Commands',
                        value: '• `/profile` - View your profile\n• `/balance` - Check balance\n• `/casino` - Access main panel\n• `/convert-eur-usd` - Currency converter',
                        inline: false
                    }
                )
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();
            
            await channel.send({ embeds: [welcomeEmbed] });
        }
        
    } catch (error) {
        console.error('Erreur envoi welcome message:', error);
    }
}

/**
 * Handle game buttons (not yet implemented)
 */
async function handleGameNotAvailable(interaction) {
    const gameNames = {
        'blackjack': '🃏 Blackjack',
        'roulette': '🎲 Roulette',
        'slots': '🎰 Slots'
    };
    
    const gameName = gameNames[interaction.customId] || 'Game';
    
    const comingSoonEmbed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('🚧 Coming Soon!')
        .setDescription(`${gameName} is currently under development and will be available soon!`)
        .addFields({
            name: '🎮 Available Features',
            value: '• Balance management\n• Currency conversion\n• Deposit/withdrawal system\n• User profiles',
            inline: false
        })
        .setFooter({ text: 'Stay tuned for exciting casino games!' })
        .setTimestamp();
    
    await interaction.reply({ embeds: [comingSoonEmbed], ephemeral: true });
}