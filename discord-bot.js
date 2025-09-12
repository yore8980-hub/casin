const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import Litecoin wallet system
const ltcWallet = require('./litecoin-casino-bot.js');
const LiveRoulette = require('./utils/liveRoulette.js');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize live roulette
const liveRoulette = new LiveRoulette(client);

// Commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Command loaded: ${command.data.name}`);
        } else {
            console.log(`⚠️  Command ${file} missing required properties`);
        }
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`✅ Event loaded: ${event.name}`);
    }
}


// Interaction handling
client.on(Events.InteractionCreate, async interaction => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            console.error(`❌ No command matching ${interaction.commandName} found.`);
            return;
        }
        
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Error executing ${interaction.commandName}:`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('There was an error while executing this command!')
                .setTimestamp();
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
    
    // Handle button interactions
    if (interaction.isButton()) {
        console.log(`🔘 Button interaction: ${interaction.customId}`);
        try {
            // Add Balance button
            if (interaction.customId === 'add_balance') {
                await handleAddBalance(interaction);
            }
            // Create channel button
            else if (interaction.customId === 'create_channel') {
                await handleCreateChannel(interaction);
            }
            // Re-add balance button
            else if (interaction.customId === 'readd_balance') {
                await handleAddBalance(interaction);
            }
            // Close channel button
            else if (interaction.customId === 'close_channel') {
                await handleCloseChannel(interaction);
            }
            // Blackjack game buttons
            else if (interaction.customId.startsWith('blackjack_')) {
                await handleBlackjackInteraction(interaction);
            }
            // Roulette game buttons
            else if (interaction.customId.startsWith('roulette_')) {
                await handleRouletteInteraction(interaction);
            }
            // Casino game quick start buttons
            else if (interaction.customId === 'casino_blackjack') {
                console.log('🃏 Casino blackjack button clicked');
                await handleCasinoBlackjack(interaction);
            }
            else if (interaction.customId === 'casino_roulette') {
                console.log('🎰 Casino roulette button clicked');
                await handleCasinoRoulette(interaction);
            }
            // Game explanation buttons
            else if (interaction.customId === 'explain_blackjack') {
                await handleExplainBlackjack(interaction);
            }
            else if (interaction.customId === 'explain_roulette') {
                await handleExplainRoulette(interaction);
            }
            else if (interaction.customId === 'explain_coinflip') {
                await handleExplainCoinflip(interaction);
            }
            // Private session button
            else if (interaction.customId === 'create_private_session') {
                await handleCreatePrivateSession(interaction);
            }
            // Channel management buttons
            else if (interaction.customId === 'close_channel') {
                await handleCloseChannel(interaction);
            }
            else if (interaction.customId === 'close_session') {
                await handleCloseSession(interaction);
            }
            // Live roulette buttons
            else if (interaction.customId.startsWith('live_roulette_')) {
                if (interaction.customId === 'live_roulette_add_bet') {
                    await handleLiveRouletteAddBet(interaction);
                } else if (interaction.customId === 'live_roulette_view_bets') {
                    await handleLiveRouletteViewBets(interaction);
                } else if (interaction.customId === 'live_roulette_start_timer') {
                    await handleLiveRouletteStartTimer(interaction);
                } else if (interaction.customId === 'live_roulette_end_session') {
                    await handleLiveRouletteEndSession(interaction);
                } else if (interaction.customId.includes('modal_')) {
                    // Handle modal button types (red, black, odd, even, etc.)
                    await handleLiveRouletteBet(interaction);
                } else {
                    // Handle other live roulette bet buttons
                    await handleLiveRouletteBet(interaction);
                }
            }
            // Coinflip progression buttons
            else if (interaction.customId.startsWith('coinflip_double_')) {
                await handleCoinflipDouble(interaction);
            }
            else if (interaction.customId === 'coinflip_cashout') {
                await handleCoinflipCashout(interaction);
            }
            // Other button handlers can be added here
            else {
                console.log(`❓ Unknown button interaction: ${interaction.customId}`);
            }
        } catch (error) {
            console.error('❌ Button interaction error:', error);
            
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
        }
    }
    
    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
        try {
            // Live roulette category selection
            if (interaction.customId === 'live_roulette_category') {
                await handleLiveRouletteCategorySelection(interaction);
            }
            // Roulette number selection (legacy)
            else if (interaction.customId === 'roulette_bet_number') {
                await handleRouletteNumberBet(interaction);
            }
        } catch (error) {
            console.error('❌ Menu interaction error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('There was an error processing your selection!')
                .setTimestamp();
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
    
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
        try {
            if (interaction.customId.startsWith('live_roulette_modal_')) {
                await handleLiveRouletteModalSubmission(interaction);
            }
        } catch (error) {
            console.error('❌ Modal interaction error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors du traitement de votre pari.')
                .setTimestamp();
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
});

// Add Balance handler
async function handleAddBalance(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const guild = interaction.guild;
        const user = interaction.user;
        const channelManager = require('./utils/channelManager.js');
        const { ChannelType, PermissionsBitField } = require('discord.js');
        
        // Generate new LTC address for each deposit request (always new address)
        const newAddress = ltcWallet.generateAddress();
        
        if (!newAddress) {
            throw new Error('Failed to generate Litecoin address');
        }
        
        // Get add balance category from config
        const fs = require('fs');
        let config = {};
        try {
            if (fs.existsSync('./data/server_config.json')) {
                const allConfigs = JSON.parse(fs.readFileSync('./data/server_config.json', 'utf8'));
                config = allConfigs[guild.id] || {};
            }
        } catch (error) {
            console.error('Error loading server config:', error);
        }
        
        // Get category
        const categoryId = config.addBalanceCategory;
        let category = null;
        if (categoryId) {
            category = guild.channels.cache.get(categoryId);
        }
        
        // Generate unique channel name
        const channelName = channelManager.getNextBalanceChannelName();
        
        // Create private deposit channel
        const depositChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category,
            topic: `Deposit channel for ${user.username} - Auto-closes in 20 minutes`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                }
            ]
        });
        
        // Register channel
        channelManager.registerChannel(depositChannel.id, user.id, 'deposit');
        
        // Link address to user and add to active deposits monitoring
        const userProfiles = require('./utils/userProfiles.js');
        const securityManager = require('./utils/securityManager.js');
        const logManager = require('./utils/logManager.js');
        
        await userProfiles.linkAddressToUser(user.id, newAddress.address);
        securityManager.addActiveDeposit(user.id, newAddress.address, 0);
        
        // Log address generation
        await logManager.sendBalanceLog(client, guild.id, {
            type: 'address_generated',
            user: user,
            address: newAddress.address
        });
        
        // Start smart monitoring for this deposit
        startSmartMonitoring();
        
        // Send deposit info to the private channel
        const depositEmbed = new EmbedBuilder()
            .setColor('#f7931a')
            .setTitle('💰 Deposit Information')
            .setDescription('Send Litecoin to the address below to add balance to your account:')
            .addFields(
                { name: '📍 Deposit Address', value: `\`${newAddress.address}\``, inline: false },
                { name: '⏱️ Detection Time', value: 'Deposits detected within 30 seconds', inline: true },
                { name: '🔒 Security', value: 'This address is unique to this deposit', inline: true },
                { name: '📈 Minimum Deposit', value: '0.001 LTC', inline: true },
                { name: '⚠️ Important', value: '• Your balance will be added once payment is confirmed\n• If no deposit is made within 20 minutes, this channel will auto-close\n• Contact staff if you experience any issues', inline: false }
            )
            .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
            .setFooter({ text: 'Casino Bot • Smart Monitoring Active' })
            .setTimestamp();
            
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_channel')
                    .setLabel('Close Channel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
        
        await depositChannel.send({ 
            content: `${user}, your private deposit channel has been created!`,
            embeds: [depositEmbed],
            components: [actionRow]
        });
        
        // Auto-close channel after 20 minutes
        setTimeout(async () => {
            try {
                await depositChannel.delete('Auto-close after 20 minutes');
                channelManager.unregisterChannel(depositChannel.id);
            } catch (error) {
                console.error('Error auto-closing deposit channel:', error);
            }
        }, 20 * 60 * 1000);
        
        // Reply to user
        const responseEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Deposit Channel Created')
            .setDescription(`Your private deposit channel has been created: ${depositChannel}`)
            .addFields({
                name: '⏰ Auto-Close',
                value: 'Channel will automatically close in 20 minutes if unused',
                inline: false
            })
            .setTimestamp();
            
        await interaction.editReply({ embeds: [responseEmbed] });
        
        console.log(`🔍 Deposit channel created for ${user.username}: ${depositChannel.name}`);
        
    } catch (error) {
        console.error('❌ Add balance error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to create deposit channel. Please try again.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Create Channel handler
async function handleCreateChannel(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const guild = interaction.guild;
        const user = interaction.user;
        
        // Check if user already has a channel
        const existingChannel = guild.channels.cache.find(channel => 
            channel.name === `casino-${user.username.toLowerCase()}` && 
            channel.type === 0 // Text channel
        );
        
        if (existingChannel) {
            const alreadyExistsEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Channel Already Exists')
                .setDescription(`You already have a private channel: ${existingChannel}`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [alreadyExistsEmbed] });
            return;
        }
        
        // Create private channel
        const channel = await guild.channels.create({
            name: `casino-${user.username.toLowerCase()}`,
            type: 0, // Text channel
            topic: `Private casino session for ${user.username}`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: ['ViewChannel', 'SendMessages']
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                }
                // Add staff role permissions here if needed
                // {
                //     id: 'STAFF_ROLE_ID',
                //     allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                // }
            ]
        });
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Private Channel Created')
            .setDescription(`Your private casino channel has been created: ${channel}`)
            .addFields(
                { name: '🎰 Features Available', value: '• Check balance\n• Play casino games\n• Withdraw funds\n• Get support', inline: false },
                { name: '⏰ Auto-Delete', value: 'Channel will be deleted after 24 hours of inactivity', inline: false }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        // Send welcome message in the new channel
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#f7931a')
            .setTitle('🎰 Welcome to Your Private Casino!')
            .setDescription(`Hello ${user}! This is your private casino session.`)
            .addFields(
                { name: '💰 Available Commands', value: '• `/profile` - View your profile\n• `/balance` - Check balance\n• `/givebal` - Transfer balance\n• `/convert-eur-usd` - Currency converter', inline: false },
                { name: '🎮 Coming Soon', value: '• Blackjack\n• Roulette\n• Slots', inline: true },
                { name: '🔧 Support', value: 'Need help? Staff can access this channel.', inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();
        
        await channel.send({ embeds: [welcomeEmbed] });
        
        console.log(`🏠 Private channel created: ${channel.name} for ${user.username}`);
        
        // Auto-close channel after 20 minutes
        setTimeout(async () => {
            try {
                const logManager = require('./utils/logManager.js');
                await logManager.sendBalanceLog(client, interaction.guild.id, {
                    type: 'channel_closed',
                    user: interaction.user,
                    details: 'Auto-close after 20 minutes'
                });
                
                await channel.delete('Auto-close after 20 minutes');
                console.log(`🔒 Auto-closed channel ${channel.name} after 20 minutes`);
            } catch (autoCloseError) {
                console.error('Error auto-closing channel:', autoCloseError);
            }
        }, 20 * 60 * 1000); // 20 minutes
        
    } catch (error) {
        console.error('❌ Create channel error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to create private channel. Please contact staff.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Close Channel handler
async function handleCloseChannel(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const channel = interaction.channel;
        
        // Log channel closure
        const logManager = require('./utils/logManager.js');
        await logManager.sendBalanceLog(client, interaction.guild.id, {
            type: 'channel_closed',
            user: interaction.user,
            details: 'Manually closed by user'
        });
        
        const confirmEmbed = new EmbedBuilder()
            .setColor('#ff6600')
            .setTitle('🔒 Channel Closing')
            .setDescription('This channel will be deleted in 5 seconds...')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [confirmEmbed] });
        
        // Delete channel after 5 seconds
        setTimeout(async () => {
            try {
                await channel.delete('Manually closed by user');
                console.log(`🔒 Channel ${channel.name} closed by ${interaction.user.username}`);
            } catch (deleteError) {
                console.error('Error deleting channel:', deleteError);
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Close channel error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Unable to close the channel. Please try again.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Blackjack interaction handler
async function handleBlackjackInteraction(interaction) {
    const { activeGames, calculateHandValue, dealCard, createGameEmbed, createGameButtons } = require('./commands/blackjack.js');
    const userProfiles = require('./utils/userProfiles.js');
    const securityManager = require('./utils/securityManager.js');
    const logManager = require('./utils/logManager.js');
    const { formatLTC } = require('./utils/formatters.js');
    
    await interaction.deferUpdate();
    
    const userId = interaction.user.id;
    const game = activeGames.get(userId);
    
    if (!game || game.status !== 'playing') {
        return;
    }
    
    try {
        if (interaction.customId === 'blackjack_hit') {
            // Player hits
            game.playerHand.push(dealCard(game));
            game.playerValue = calculateHandValue(game.playerHand);
            game.canDoubleDown = false;
            
            if (game.playerValue > 21) {
                game.status = 'lost';
                activeGames.delete(userId);
                
                // Log the game
                await logManager.sendGamblingLog(client, interaction.guild.id, {
                    type: 'blackjack',
                    user: interaction.user,
                    game: 'blackjack',
                    bet: game.bet,
                    result: 'lose',
                    payout: 0,
                    details: `Player busted with ${game.playerValue}`
                });
            }
            
        } else if (interaction.customId === 'blackjack_stand') {
            // Player stands - dealer plays
            while (game.dealerValue < 17) {
                game.dealerHand.push(dealCard(game));
                game.dealerValue = calculateHandValue(game.dealerHand);
            }
            
            // Determine winner
            let payout = 0;
            if (game.dealerValue > 21) {
                game.status = 'won';
                payout = game.bet * 2;
            } else if (game.playerValue > game.dealerValue) {
                game.status = 'won';
                payout = game.bet * 2;
            } else if (game.playerValue < game.dealerValue) {
                game.status = 'lost';
                payout = 0;
            } else {
                game.status = 'push';
                payout = game.bet; // Return bet
            }
            
            // Update balance
            if (payout > 0) {
                const profile = userProfiles.getUserProfile(userId);
                userProfiles.updateUserProfile(userId, { 
                    balance: profile.balance + payout 
                });
            }
            
            // Log the game
            await logManager.sendGamblingLog(client, interaction.guild.id, {
                type: 'blackjack',
                user: interaction.user,
                game: 'blackjack',
                bet: game.bet,
                result: game.status === 'won' ? 'win' : game.status === 'lost' ? 'lose' : 'push',
                payout: payout,
                details: `Player: ${game.playerValue}, Dealer: ${game.dealerValue}`
            });
            
            activeGames.delete(userId);
            
        } else if (interaction.customId === 'blackjack_double') {
            // Player doubles down
            const profile = userProfiles.getUserProfile(userId);
            if (profile.balance >= game.bet) {
                userProfiles.updateUserProfile(userId, { 
                    balance: profile.balance - game.bet 
                });
                securityManager.addWageredAmount(userId, game.bet);
                
                game.bet *= 2;
                game.playerHand.push(dealCard(game));
                game.playerValue = calculateHandValue(game.playerHand);
                
                if (game.playerValue > 21) {
                    game.status = 'lost';
                } else {
                    // Dealer plays
                    while (game.dealerValue < 17) {
                        game.dealerHand.push(dealCard(game));
                        game.dealerValue = calculateHandValue(game.dealerHand);
                    }
                    
                    // Determine winner
                    let payout = 0;
                    if (game.dealerValue > 21 || game.playerValue > game.dealerValue) {
                        game.status = 'won';
                        payout = game.bet * 2;
                    } else if (game.playerValue < game.dealerValue) {
                        game.status = 'lost';
                        payout = 0;
                    } else {
                        game.status = 'push';
                        payout = game.bet;
                    }
                    
                    if (payout > 0) {
                        const updatedProfile = userProfiles.getUserProfile(userId);
                        userProfiles.updateUserProfile(userId, { 
                            balance: updatedProfile.balance + payout 
                        });
                    }
                }
                
                // Log the game
                await logManager.sendGamblingLog(client, interaction.guild.id, {
                    type: 'blackjack',
                    user: interaction.user,
                    game: 'blackjack',
                    bet: game.bet,
                    result: game.status === 'won' ? 'win' : game.status === 'lost' ? 'lose' : 'push',
                    payout: payout || 0,
                    details: `Double Down - Player: ${game.playerValue}, Dealer: ${game.dealerValue}`
                });
                
                activeGames.delete(userId);
            }
        }
        
        // Update the game display
        const gameEmbed = createGameEmbed(game, interaction.user);
        const gameButtons = createGameButtons(game);
        
        await interaction.editReply({ 
            embeds: [gameEmbed],
            components: game.status === 'playing' ? [gameButtons] : []
        });
        
    } catch (error) {
        console.error('Erreur blackjack interaction:', error);
    }
}

// Roulette interaction handler
async function handleRouletteInteraction(interaction) {
    const { activeSpins, spinWheel, calculatePayout, createResultEmbed, createBettingEmbed, createBettingComponents } = require('./commands/roulette.js');
    const userProfiles = require('./utils/userProfiles.js');
    const securityManager = require('./utils/securityManager.js');
    const logManager = require('./utils/logManager.js');
    const { formatLTC } = require('./utils/formatters.js');
    
    await interaction.deferUpdate();
    
    const userId = interaction.user.id;
    const spin = activeSpins.get(userId);
    
    if (!spin || spin.status !== 'betting') {
        return;
    }
    
    try {
        if (interaction.customId === 'roulette_spin') {
            if (spin.bets.size === 0) {
                return; // No bets placed
            }
            
            // Deduct total bet amount
            let totalBet = 0;
            for (const [, amount] of spin.bets) {
                totalBet += amount;
            }
            
            const profile = userProfiles.getUserProfile(userId);
            userProfiles.updateUserProfile(userId, { 
                balance: profile.balance - totalBet 
            });
            securityManager.addWageredAmount(userId, totalBet);
            
            // Spin the wheel
            const result = spinWheel();
            const { totalPayout, winningBets } = calculatePayout(spin.bets, result);
            
            // Add winnings to balance
            if (totalPayout > 0) {
                const updatedProfile = userProfiles.getUserProfile(userId);
                userProfiles.updateUserProfile(userId, { 
                    balance: updatedProfile.balance + totalPayout 
                });
            }
            
            // Log the game
            await logManager.sendGamblingLog(client, interaction.guild.id, {
                type: 'roulette',
                user: interaction.user,
                game: 'roulette',
                bet: totalBet,
                result: totalPayout > 0 ? 'win' : 'lose',
                payout: totalPayout,
                details: `Number ${result}, Total Bet: ${formatLTC(totalBet)} LTC`
            });
            
            // Check for big win (5x or more)
            if (totalPayout >= totalBet * 5) {
                await logManager.sendGamblingLog(client, interaction.guild.id, {
                    type: 'big_win',
                    user: interaction.user,
                    game: 'roulette',
                    bet: totalBet,
                    result: 'win',
                    payout: totalPayout
                });
            }
            
            spin.status = 'finished';
            spin.result = result;
            spin.totalPayout = totalPayout;
            
            const resultEmbed = createResultEmbed(spin, result, totalPayout, winningBets, interaction.user);
            
            await interaction.editReply({ 
                embeds: [resultEmbed],
                components: []
            });
            
            activeSpins.delete(userId);
            
        } else if (interaction.customId === 'roulette_clear') {
            spin.bets.clear();
            const bettingEmbed = createBettingEmbed(spin, interaction.user);
            const bettingComponents = createBettingComponents();
            
            await interaction.editReply({ 
                embeds: [bettingEmbed],
                components: bettingComponents
            });
            
        } else if (interaction.customId === 'roulette_cancel') {
            activeSpins.delete(userId);
            
            const cancelEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🚫 Roulette Cancelled')
                .setDescription('Your roulette game has been cancelled.')
                .setTimestamp();
            
            await interaction.editReply({ 
                embeds: [cancelEmbed],
                components: []
            });
            
        } else {
            // Handle bet buttons
            const betType = interaction.customId.replace('roulette_bet_', '');
            const betAmount = spin.bet / 4; // Split bet into quarters
            
            if (spin.bets.has(betType)) {
                spin.bets.set(betType, spin.bets.get(betType) + betAmount);
            } else {
                spin.bets.set(betType, betAmount);
            }
            
            const bettingEmbed = createBettingEmbed(spin, interaction.user);
            const bettingComponents = createBettingComponents();
            
            await interaction.editReply({ 
                embeds: [bettingEmbed],
                components: bettingComponents
            });
        }
        
    } catch (error) {
        console.error('Erreur roulette interaction:', error);
    }
}

// Roulette number bet handler
async function handleRouletteNumberBet(interaction) {
    const { activeSpins, createBettingEmbed, createBettingComponents } = require('./commands/roulette.js');
    
    await interaction.deferUpdate();
    
    const userId = interaction.user.id;
    const spin = activeSpins.get(userId);
    
    if (!spin || spin.status !== 'betting') {
        return;
    }
    
    try {
        const selectedValue = interaction.values[0];
        const betAmount = spin.bet / 4; // Split bet into quarters
        
        if (spin.bets.has(selectedValue)) {
            spin.bets.set(selectedValue, spin.bets.get(selectedValue) + betAmount);
        } else {
            spin.bets.set(selectedValue, betAmount);
        }
        
        const bettingEmbed = createBettingEmbed(spin, interaction.user);
        const bettingComponents = createBettingComponents();
        
        await interaction.editReply({ 
            embeds: [bettingEmbed],
            components: bettingComponents
        });
        
    } catch (error) {
        console.error('Erreur roulette number bet:', error);
    }
}

// Casino game quick start handlers
async function handleCasinoBlackjack(interaction) {
    await interaction.deferUpdate();
    
    const quickPlayEmbed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('🃏 Quick Play Blackjack')
        .setDescription('Ready to play Blackjack? Use the command `/blackjack <bet>` to start!')
        .addFields(
            {
                name: '🎯 How to Play',
                value: '• Beat the dealer by getting closer to 21 without going over\n• Face cards are worth 10, Aces are 1 or 11\n• You can Hit, Stand, or Double Down',
                inline: false
            },
            {
                name: '💰 Example Commands',
                value: '• `/blackjack bet:0.01` - Play with 0.01 LTC\n• `/blackjack bet:0.1` - Play with 0.1 LTC',
                inline: false
            }
        )
        .setFooter({ text: 'Good luck at the tables!' })
        .setTimestamp();
    
    await interaction.editReply({ embeds: [quickPlayEmbed] });
}

async function handleCasinoRoulette(interaction) {
    await interaction.deferUpdate();
    
    const quickPlayEmbed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('🎰 Quick Play Roulette')
        .setDescription('Ready to spin the wheel? Use the command `/roulette <bet>` to start!')
        .addFields(
            {
                name: '🎯 How to Play',
                value: '• Choose your bets: numbers (35:1), colors (1:1), even/odd (1:1)\n• The ball will land on a number from 0-36\n• Multiple bets allowed per spin',
                inline: false
            },
            {
                name: '💰 Example Commands',
                value: '• `/roulette bet:0.01` - Play with 0.01 LTC\n• `/roulette bet:0.1` - Play with 0.1 LTC',
                inline: false
            }
        )
        .setFooter({ text: 'Place your bets!' })
        .setTimestamp();
    
    await interaction.editReply({ embeds: [quickPlayEmbed] });
}

// Smart monitoring system
let monitoringInterval = null;

/**
 * Start smart monitoring for active deposits
 */
function startSmartMonitoring() {
    // Don't start if already running
    if (monitoringInterval) return;
    
    console.log('🔍 Démarrage de la surveillance des dépôts...');
    
    // Surveillance automatique toutes les 2 minutes pour respecter les limites API gratuites
    monitoringInterval = setInterval(async () => {
        try {
            const securityManager = require('./utils/securityManager.js');
            const userProfiles = require('./utils/userProfiles.js');
            
            // Get all active deposits
            const activeDeposits = securityManager.getAllActiveDeposits();
            
            if (activeDeposits.length === 0) {
                console.log('ℹ️  Aucun dépôt actif - arrêt de la surveillance');
                stopSmartMonitoring();
                return;
            }
            
            // Check for new deposits
            const detectedDeposits = await ltcWallet.smartDepositCheck(activeDeposits);
            
            // Process detected deposits
            for (const deposit of detectedDeposits) {
                try {
                    // Add deposit to user profile
                    userProfiles.addDeposit(deposit.userId, deposit.amount, deposit.address);
                    
                    // Add to deposited amount for cashout protection
                    securityManager.addDepositedAmount(deposit.userId, deposit.amount);
                    
                    // Mark deposit as completed
                    securityManager.completeDepositRequest(deposit.userId, deposit.address);
                    
                    // Notify user
                    await notifyUserOfDeposit(deposit);
                    
                } catch (error) {
                    console.error('Erreur traitement dépôt:', error);
                }
            }
            
        } catch (error) {
            console.error('Erreur surveillance intelligente:', error);
        }
    }, 120000); // Check every 2 minutes pour respecter les limites BlockCypher gratuit
}

/**
 * Stop smart monitoring
 */
function stopSmartMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('🛑 Surveillance intelligente arrêtée');
    }
}

/**
 * Notify user of detected deposit
 */
async function notifyUserOfDeposit(deposit) {
    try {
        const user = await client.users.fetch(deposit.userId);
        
        if (user) {
            const depositEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Deposit Confirmed!')
                .setDescription('Your Litecoin deposit has been confirmed and added to your balance.')
                .addFields(
                    {
                        name: '💰 Deposit Amount',
                        value: `**${deposit.amount.toFixed(8)} LTC**`,
                        inline: true
                    },
                    {
                        name: '📍 Address',
                        value: `\`${deposit.address}\``,
                        inline: false
                    },
                    {
                        name: '🎰 Ready to Play',
                        value: 'Use `/casino` to start playing!\n**Note:** You must wager 100% of deposited amount before cashout.',
                        inline: false
                    }
                )
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setTimestamp();
            
            // Try to send DM
            try {
                await user.send({ embeds: [depositEmbed] });
                console.log(`💰 Utilisateur ${user.username} notifié du dépôt de ${deposit.amount} LTC`);
            } catch (dmError) {
                console.log(`Impossible d'envoyer un MP à ${user.username}:`, dmError.message);
            }
        }
    } catch (error) {
        console.log('Unable to notify user of deposit:', error.message);
    }
}

// Game explanation handlers
async function handleExplainBlackjack(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🃏 How to Play Blackjack')
        .setDescription('Beat the dealer by getting closer to 21 without going over!')
        .addFields(
            {
                name: '🎯 Objective',
                value: 'Get a hand value closer to 21 than the dealer without exceeding it.',
                inline: false
            },
            {
                name: '🃏 Card Values',
                value: '• Number cards (2-10): Face value\n• Face cards (J, Q, K): 10 points\n• Ace: 1 or 11 points (best value automatically chosen)',
                inline: false
            },
            {
                name: '🎮 How to Play',
                value: '1. Use `/blackjack <amount>` in this channel\n2. You and dealer get 2 cards each\n3. Choose to Hit (get another card) or Stand (keep current hand)\n4. Try to get closer to 21 than the dealer!',
                inline: false
            },
            {
                name: '🏆 Winning Conditions',
                value: '• **Blackjack**: 21 with first 2 cards (pays 3:2)\n• **Win**: Closer to 21 than dealer (pays 1:1)\n• **Push**: Same value as dealer (bet returned)\n• **Bust**: Over 21 (lose bet)',
                inline: false
            }
        )
        .setFooter({ text: 'Good luck at the tables!' })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleExplainRoulette(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎲 How to Play Roulette')
        .setDescription('Place your bets and watch the wheel spin!')
        .addFields(
            {
                name: '🎯 Objective',
                value: 'Predict where the ball will land on the spinning wheel.',
                inline: false
            },
            {
                name: '🎮 How to Play',
                value: '1. Use `/roulette <amount>` in this channel\n2. Choose your bet type:\n   • Number bet (0-36)\n   • Color bet (Red/Black)\n   • Even/Odd bet\n3. Watch the wheel spin and see if you win!',
                inline: false
            },
            {
                name: '💰 Payouts',
                value: '• **Number bet**: 35:1 (guess exact number)\n• **Color bet**: 1:1 (red or black)\n• **Even/Odd bet**: 1:1 (even or odd numbers)\n• **Zero**: Wins number bets only',
                inline: false
            },
            {
                name: '🎰 The Wheel',
                value: 'European wheel with numbers 0-36. Zero (0) is green, others alternate red and black.',
                inline: false
            }
        )
        .setFooter({ text: 'Place your bets!' })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleExplainCoinflip(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle('🪙 How to Play Coinflip')
        .setDescription('The simplest casino game - just pick heads or tails!')
        .addFields(
            {
                name: '🎯 Objective',
                value: 'Predict the outcome of a coin flip.',
                inline: false
            },
            {
                name: '🎮 How to Play',
                value: '1. Use `/coinflip <amount>` in this channel\n2. Choose Heads or Tails\n3. Watch the coin flip!\n4. If you guess correctly, you double your bet!',
                inline: false
            },
            {
                name: '💰 Payouts',
                value: '• **Correct guess**: 1:1 (double your money)\n• **Wrong guess**: Lose your bet\n• **50/50 chance** - pure luck!',
                inline: false
            },
            {
                name: '🎲 Perfect for Beginners',
                value: 'No strategy needed - just pick your side and hope for the best!',
                inline: false
            }
        )
        .setFooter({ text: 'Flip that coin!' })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCreatePrivateSession(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const guild = interaction.guild;
        const user = interaction.user;
        const { ChannelType, PermissionsBitField } = require('discord.js');
        
        // Check if user already has a private session
        const existingChannel = guild.channels.cache.find(channel => 
            channel.name === `session-${user.username.toLowerCase()}` && 
            channel.type === ChannelType.GuildText
        );
        
        if (existingChannel) {
            const alreadyExistsEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Session Already Exists')
                .setDescription(`You already have an active private session: ${existingChannel}`)
                .addFields({
                    name: '🎮 Available Commands',
                    value: 'Use `/addplayer` in your session to invite other players',
                    inline: false
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [alreadyExistsEmbed] });
            return;
        }
        
        // Create private session channel
        const sessionChannel = await guild.channels.create({
            name: `session-${user.username.toLowerCase()}`,
            type: ChannelType.GuildText,
            topic: `Private gaming session owned by ${user.username}`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages]
                }
            ]
        });
        
        // Send welcome message to session
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('🔒 Private Gaming Session Created')
            .setDescription(`Welcome to your private gaming session, ${user}!`)
            .addFields(
                {
                    name: '🎮 Available Games',
                    value: '• `/blackjack <amount>` - Play private blackjack\n• `/roulette <amount>` - Play private roulette\n• `/coinflip <amount>` - Play private coinflip',
                    inline: false
                },
                {
                    name: '👥 Session Management',
                    value: '• Use `/addplayer @user` to invite players\n• Only you can manage this session\n• Session auto-closes after 2 hours of inactivity',
                    inline: false
                },
                {
                    name: '🔒 Privacy',
                    value: 'This is your private space - only invited players can see and participate',
                    inline: false
                }
            )
            .setFooter({ text: 'Private Session • Auto-closes after 2 hours of inactivity' })
            .setTimestamp();
            
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_session')
                    .setLabel('End Session')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );
        
        await sessionChannel.send({ 
            embeds: [welcomeEmbed],
            components: [actionRow]
        });
        
        // Auto-close session after 2 hours of inactivity
        setTimeout(async () => {
            try {
                await sessionChannel.delete('Auto-close after 2 hours of inactivity');
            } catch (error) {
                console.error('Error auto-closing session channel:', error);
            }
        }, 2 * 60 * 60 * 1000);
        
        // Reply to user
        const responseEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Private Session Created')
            .setDescription(`Your private gaming session has been created: ${sessionChannel}`)
            .addFields({
                name: '⏰ Auto-Close',
                value: 'Session will automatically close in 2 hours if unused',
                inline: false
            })
            .setTimestamp();
            
        await interaction.editReply({ embeds: [responseEmbed] });
        
        console.log(`🔒 Private session created for ${user.username}: ${sessionChannel.name}`);
        
    } catch (error) {
        console.error('❌ Create private session error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to create private session. Please try again.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Export for external use
module.exports = {
    client,
    handleAddBalance,
    handleCreateChannel,
    startSmartMonitoring,
    stopSmartMonitoring
};

// Gestion d'erreurs globales pour éviter les déconnexions
process.on('uncaughtException', (error) => {
    console.error('⚠️ Erreur non gérée capturée:', error);
    console.log('🔄 Le bot continue de fonctionner...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Promesse rejetée non gérée:', reason);
    console.log('🔄 Le bot continue de fonctionner...');
});

// Gestion des erreurs Discord
client.on('error', (error) => {
    console.error('⚠️ Erreur client Discord:', error);
    console.log('🔄 Tentative de reconnexion...');
});

client.on('warn', (info) => {
    console.warn('⚠️ Avertissement Discord:', info);
});

client.on('disconnect', () => {
    console.log('⚠️ Bot déconnecté, tentative de reconnexion...');
});

client.on('reconnecting', () => {
    console.log('🔄 Reconnexion en cours...');
});

// Channel management handlers
async function handleCloseChannel(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const channel = interaction.channel;
        const channelManager = require('./utils/channelManager.js');
        
        // Check if user owns this channel
        const channelInfo = channelManager.getChannelInfo(channel.id);
        if (!channelInfo || channelInfo.userId !== interaction.user.id) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Permission Denied')
                .setDescription('You can only close channels that belong to you.')
                .setTimestamp();
                
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        const confirmEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Channel Closed')
            .setDescription('This channel will be deleted in 5 seconds...')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [confirmEmbed] });
        
        // Clean up and delete channel
        setTimeout(async () => {
            try {
                channelManager.unregisterChannel(channel.id);
                await channel.delete('User requested closure');
            } catch (error) {
                console.error('Error deleting channel:', error);
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Close channel error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to close channel.')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleCloseSession(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const channel = interaction.channel;
        const expectedName = `session-${interaction.user.username.toLowerCase()}`;
        
        // Check if user owns this session
        if (channel.name !== expectedName) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Permission Denied')
                .setDescription('You can only close your own private sessions.')
                .setTimestamp();
                
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        const confirmEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Session Ended')
            .setDescription('Your private session will be deleted in 5 seconds...')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [confirmEmbed] });
        
        // Delete session after delay
        setTimeout(async () => {
            try {
                await channel.delete('Session ended by user');
            } catch (error) {
                console.error('Error deleting session:', error);
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Close session error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to close session.')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleLiveRouletteBet(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const betType = interaction.customId.replace('live_roulette_', '');
        const userId = interaction.user.id;
        
        // For now, use a fixed bet amount of 0.01 LTC
        const betAmount = 0.01;
        
        // Check if user has balance
        const userProfiles = require('./utils/userProfiles.js');
        const profile = userProfiles.getUserProfile(userId);
        
        if (profile.balance < betAmount) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Balance')
                .setDescription(`You need at least ${betAmount.toFixed(3)} LTC to place this bet.`)
                .addFields({
                    name: '💰 Your Balance',
                    value: `${profile.balance.toFixed(8)} LTC`,
                    inline: false
                })
                .setTimestamp();
                
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Place bet in live roulette
        const result = liveRoulette.placeBet(userId, betType, betAmount);
        
        if (!result.success) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('⚠️ Betting Closed')
                .setDescription(result.message)
                .setTimestamp();
                
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Deduct bet from balance
        profile.balance -= betAmount;
        userProfiles.saveProfile(userId, profile);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Bet Placed!')
            .setDescription(`Your bet on **${betType}** has been placed for the live roulette.`)
            .addFields(
                { name: '🎯 Bet Type', value: betType.charAt(0).toUpperCase() + betType.slice(1), inline: true },
                { name: '💰 Bet Amount', value: `${betAmount.toFixed(3)} LTC`, inline: true },
                { name: '💳 Remaining Balance', value: `${profile.balance.toFixed(8)} LTC`, inline: true }
            )
            .setFooter({ text: 'Good luck! Results will be announced in the live channel.' })
            .setTimestamp();
            
        await interaction.editReply({ embeds: [successEmbed] });
        
    } catch (error) {
        console.error('❌ Live roulette bet error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to place bet.')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Function to start live roulette when server is configured
function startLiveRouletteIfConfigured() {
    try {
        const fs = require('fs');
        if (fs.existsSync('./data/server_config.json')) {
            const allConfigs = JSON.parse(fs.readFileSync('./data/server_config.json', 'utf8'));
            
            for (const [guildId, config] of Object.entries(allConfigs)) {
                if (config.liveRouletteChannel) {
                    const channel = client.channels.cache.get(config.liveRouletteChannel);
                    if (channel) {
                        liveRoulette.start(config.liveRouletteChannel);
                        console.log(`🎰 Live roulette started for guild ${guildId}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error starting live roulette:', error);
    }
}

// Live roulette interaction handlers
async function handleLiveRouletteBet(interaction) {
    const rouletteModule = require('./commands/roulette.js');
    const { liveRouletteSessions } = rouletteModule;
    
    if (interaction.customId === 'live_roulette_add_bet') {
        // Check if a category is selected first
        await interaction.deferReply({ ephemeral: true });
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Catégorie Requise')
            .setDescription('Veuillez d\'abord sélectionner une catégorie de pari dans le menu déroulant.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    } else if (interaction.customId === 'live_roulette_spin') {
        await interaction.deferReply({ ephemeral: false });
        
        const session = liveRouletteSessions.get(interaction.channel.id);
        if (!session || !session.isActive) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Session Expirée')
                .setDescription('Aucune session de roulette active dans ce canal.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        if (session.pendingBets.size === 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Aucun Pari')
                .setDescription('Aucun pari n\'a été placé pour cette session.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Start the spin
        session.hasSpun = true;
        await rouletteModule.performSpin(interaction, session);
    } else if (interaction.customId === 'live_roulette_stop') {
        await interaction.deferReply({ ephemeral: false });
        
        const session = liveRouletteSessions.get(interaction.channel.id);
        if (session) {
            await rouletteModule.endLiveRouletteSession(interaction.channel.id, interaction.client);
        }
        
        const stopEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🛑 Session Arrêtée')
            .setDescription('La session de roulette a été arrêtée. Tous les paris en attente ont été remboursés.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [stopEmbed], components: [] });
    }
}

async function handleLiveRouletteCategorySelection(interaction) {
    const selectedCategory = interaction.values[0];
    const rouletteModule = require('./commands/roulette.js');
    
    // Create and show modal for the selected category
    const modal = rouletteModule.createBetModal(selectedCategory);
    await interaction.showModal(modal);
}

async function handleLiveRouletteModalSubmission(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const rouletteModule = require('./commands/roulette.js');
        const userProfiles = require('./utils/userProfiles.js');
        const { liveRouletteSessions } = rouletteModule;
        
        const betType = interaction.customId.split('_').pop();
        const choice = interaction.fields.getTextInputValue('bet_choice').trim().toLowerCase();
        const amountStr = interaction.fields.getTextInputValue('bet_amount').trim();
        const amount = parseFloat(amountStr);
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;
        
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Montant Invalide')
                .setDescription('Veuillez entrer un montant valide en LTC.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Check session
        const session = liveRouletteSessions.get(channelId);
        if (!session || !session.isActive) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Session Expirée')
                .setDescription('La session de roulette a expiré.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Check user balance
        const profile = userProfiles.getUserProfile(userId);
        if (profile.balance < amount) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Solde Insuffisant')
                .setDescription(`Vous avez besoin de ${amount.toFixed(8)} LTC mais vous n'avez que ${profile.balance.toFixed(8)} LTC.`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Validate and parse choice based on bet type
        let parsedDetails;
        
        if (betType === 'number') {
            const numbers = choice.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 36);
            if (numbers.length === 0) {
                throw new Error('Numéros invalides. Utilisez des nombres entre 0 et 36 séparés par des virgules.');
            }
            parsedDetails = numbers;
        } else if (betType === 'color') {
            if (!['red', 'black'].includes(choice)) {
                throw new Error('Couleur invalide. Utilisez "red" ou "black".');
            }
            parsedDetails = choice;
        } else if (betType === 'dozen') {
            if (!['1st12', '2nd12', '3rd12'].includes(choice)) {
                throw new Error('Douzaine invalide. Utilisez "1st12", "2nd12" ou "3rd12".');
            }
            parsedDetails = choice;
        } else if (betType === 'column') {
            if (!['1st column', '2nd column', '3rd column'].includes(choice)) {
                throw new Error('Colonne invalide. Utilisez "1st column", "2nd column" ou "3rd column".');
            }
            parsedDetails = choice;
        } else if (betType === 'evenodd') {
            if (!['even', 'odd'].includes(choice)) {
                throw new Error('Pari invalide. Utilisez "even" ou "odd".');
            }
            parsedDetails = choice;
        } else if (betType === 'range') {
            if (!['1-18', '19-36'].includes(choice)) {
                throw new Error('Range invalide. Utilisez "1-18" ou "19-36".');
            }
            parsedDetails = choice;
        }
        
        // Create bet object
        const bet = {
            type: betType,
            details: parsedDetails,
            amount: amount
        };
        
        // Add bet to session
        if (!session.pendingBets.has(userId)) {
            session.pendingBets.set(userId, []);
        }
        session.pendingBets.get(userId).push(bet);
        
        // Success message
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Pari Ajouté')
            .setDescription(`Votre pari a été ajouté avec succès !\\n\\n**Type**: ${betType}\\n**Détails**: ${Array.isArray(parsedDetails) ? parsedDetails.join(', ') : parsedDetails}\\n**Montant**: ${amount.toFixed(8)} LTC`)
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        console.log(`💰 ${interaction.user.username} added bet: ${betType} - ${parsedDetails} - ${amount} LTC`);
        
    } catch (error) {
        console.error('Live roulette modal error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur de Pari')
            .setDescription(error.message || 'Une erreur est survenue lors de l\'ajout de votre pari.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Coinflip progression button handlers
async function handleCoinflipDouble(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const betAmount = parseFloat(interaction.customId.split('_')[2]);
        const userId = interaction.user.id;
        
        // Get coinflip command and its active sessions
        const coinflipCommand = client.commands.get('coinflip');
        const activeSessions = coinflipCommand.activeSessions || new Map();
        
        const session = activeSessions.get(userId);
        if (!session) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Session Expirée')
                .setDescription('Votre session de coinflip a expiré. Commencez une nouvelle partie avec `/coinflip`.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Check user balance
        const profile = require('./utils/userProfiles.js').getUserProfile(userId);
        if (profile.balance < betAmount) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Solde Insuffisant')
                .setDescription(`Vous avez besoin de ${betAmount.toFixed(8)} LTC pour doubler votre mise.`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Use the same choice as previous round
        const previousChoice = session.lastChoice || 'heads';
        
        // Call the animation function from coinflip command
        await coinflipCommand.showCoinflipAnimation(interaction, betAmount, previousChoice);
        
    } catch (error) {
        console.error('Coinflip double error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du double ou rien.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleCoinflipCashout(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const userId = interaction.user.id;
        
        // Get coinflip command and its active sessions
        const coinflipCommand = client.commands.get('coinflip');
        const activeSessions = coinflipCommand.activeSessions || new Map();
        
        const session = activeSessions.get(userId);
        if (!session) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Session Expirée')
                .setDescription('Votre session de coinflip a expiré.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Add winnings to user balance
        const userProfiles = require('./utils/userProfiles.js');
        const profile = userProfiles.getUserProfile(userId);
        const finalBalance = profile.balance + session.totalWinnings;
        userProfiles.updateUserProfile(userId, { balance: finalBalance });
        
        // Clear session
        activeSessions.delete(userId);
        
        // Create cashout embed
        const cashoutEmbed = new EmbedBuilder()
            .setColor('#27ae60')
            .setTitle('💰 Encaissement Réussi!')
            .setDescription(`Vous avez encaissé vos gains avec succès!`)
            .addFields(
                {
                    name: '🎉 Gains Encaissés',
                    value: `${session.totalWinnings.toFixed(8)} LTC`,
                    inline: true
                },
                {
                    name: '🏆 Série de Victoires',
                    value: `${session.streak} victoire(s) consécutive(s)`,
                    inline: true
                },
                {
                    name: '💳 Nouveau Solde',
                    value: `${finalBalance.toFixed(8)} LTC`,
                    inline: false
                }
            )
            .setImage('https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif')
            .setFooter({ text: 'Félicitations! Vous pouvez relancer une nouvelle partie.' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [cashoutEmbed] });
        
        console.log(`💰 ${interaction.user.username} cashed out ${session.totalWinnings.toFixed(8)} LTC from coinflip`);
        
    } catch (error) {
        console.error('Coinflip cashout error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'encaissement.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Live Roulette Handlers
async function handleLiveRouletteBet(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const betType = interaction.customId.replace('live_roulette_', '');
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;
        
        // Check if live roulette is active in this channel
        if (!liveRoulette.isRunning || liveRoulette.liveChannelId !== channelId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Active Session')
                .setDescription('There is no active live roulette session in this channel.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Check if betting is open
        if (!liveRoulette.bettingPhase) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Betting Closed')
                .setDescription('Betting is closed for this round. Wait for the next round!')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Show modal for bet amount
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        
        const modal = new ModalBuilder()
            .setCustomId(`live_roulette_modal_${betType}`)
            .setTitle(`Bet on ${betType.charAt(0).toUpperCase() + betType.slice(1)}`);
        
        const amountInput = new TextInputBuilder()
            .setCustomId('bet_amount')
            .setLabel('Bet Amount (LTC)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.001')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10);
        
        const amountRow = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(amountRow);
        
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('❌ Live roulette bet error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your bet.')
            .setTimestamp();
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

async function handleLiveRouletteCategorySelection(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const selectedCategory = interaction.values[0];
        
        // Show modal based on category selection
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        
        const modal = new ModalBuilder()
            .setCustomId(`live_roulette_modal_${selectedCategory}`)
            .setTitle(`Place ${selectedCategory} Bet`);
        
        let choiceInput, amountInput;
        
        if (selectedCategory === 'number') {
            choiceInput = new TextInputBuilder()
                .setCustomId('bet_choice')
                .setLabel('Number (0-36)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('7')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2);
        } else if (selectedCategory === 'color') {
            choiceInput = new TextInputBuilder()
                .setCustomId('bet_choice')
                .setLabel('Color (red/black)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('red')
                .setRequired(true);
        }
        
        amountInput = new TextInputBuilder()
            .setCustomId('bet_amount')
            .setLabel('Bet Amount (LTC)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0.001')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10);
        
        if (choiceInput) {
            const choiceRow = new ActionRowBuilder().addComponents(choiceInput);
            modal.addComponents(choiceRow);
        }
        
        const amountRow = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(amountRow);
        
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('❌ Live roulette category selection error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your selection.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleLiveRouletteModalSubmission(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const betType = interaction.customId.replace('live_roulette_modal_', '');
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;
        
        // Get bet details from modal
        const betAmount = parseFloat(interaction.fields.getTextInputValue('bet_amount'));
        let betChoice = null;
        
        try {
            betChoice = interaction.fields.getTextInputValue('bet_choice');
        } catch (error) {
            // bet_choice is optional for some bet types
        }
        
        // Validate bet amount
        if (isNaN(betAmount) || betAmount <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Invalid Bet Amount')
                .setDescription('Please enter a valid bet amount greater than 0.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        if (betAmount < 0.001) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Minimum Bet')
                .setDescription('Minimum bet is 0.001 LTC.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Check user balance
        const userProfiles = require('./utils/userProfiles.js');
        const profile = userProfiles.getUserProfile(userId);
        
        if (profile.balance < betAmount) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Balance')
                .setDescription(`You need ${betAmount.toFixed(8)} LTC to place this bet.\nYour current balance: ${profile.balance.toFixed(8)} LTC`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Check if live roulette is active and betting is open
        if (!liveRoulette.isRunning || liveRoulette.liveChannelId !== channelId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Active Session')
                .setDescription('There is no active live roulette session in this channel.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        if (!liveRoulette.bettingPhase) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Betting Closed')
                .setDescription('Betting is closed for this round. Your bet was not placed.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Process specific bet types
        let finalBetType = betType;
        
        if (betType === 'number' && betChoice !== null) {
            const number = parseInt(betChoice);
            if (isNaN(number) || number < 0 || number > 36) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Number')
                    .setDescription('Please enter a number between 0 and 36.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            finalBetType = `number_${number}`;
        } else if (betType === 'color' && betChoice !== null) {
            if (!['red', 'black'].includes(betChoice.toLowerCase())) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Color')
                    .setDescription('Please enter "red" or "black".')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            finalBetType = betChoice.toLowerCase();
        }
        
        // Deduct bet amount from user balance
        profile.balance -= betAmount;
        userProfiles.saveProfile(userId, profile);
        
        // Place the bet
        const result = liveRoulette.placeBet(userId, finalBetType, betAmount);
        
        if (result.success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Bet Placed!')
                .setDescription(`Your bet has been placed successfully!`)
                .addFields(
                    { name: '🎯 Bet Type', value: finalBetType.replace('_', ' '), inline: true },
                    { name: '💰 Amount', value: `${betAmount.toFixed(8)} LTC`, inline: true },
                    { name: '💳 New Balance', value: `${profile.balance.toFixed(8)} LTC`, inline: true }
                )
                .setFooter({ text: `Time left to bet: ${liveRoulette.timeLeft} seconds` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log the bet
            const logManager = require('./utils/logManager.js');
            await logManager.sendGamblingLog(client, interaction.guild.id, {
                type: 'bet_placed',
                user: interaction.user,
                game: 'Live Roulette',
                amount: betAmount,
                betType: finalBetType
            });
            
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Bet Failed')
                .setDescription(result.message || 'Failed to place bet.')
                .setTimestamp();
            
            // Refund the bet amount
            profile.balance += betAmount;
            userProfiles.saveProfile(userId, profile);
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
        
    } catch (error) {
        console.error('❌ Live roulette modal submission error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your bet.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Additional Live Roulette Handler Functions
async function handleLiveRouletteAddBet(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const channelId = interaction.channel.id;
        const userId = interaction.user.id;
        
        // Check if there's an active session
        const rouletteCommand = require('./commands/roulette.js');
        const liveRouletteSessions = rouletteCommand.liveRouletteSessions;
        
        if (!liveRouletteSessions.has(channelId)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Active Session')
                .setDescription('There is no active roulette session in this channel.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        const session = liveRouletteSessions.get(channelId);
        
        if (!session.bettingOpen) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Betting Closed')
                .setDescription('Betting is currently closed for this round.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Show instruction to use dropdown first
        const instructionEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📋 How to Place a Bet')
            .setDescription('To place a bet, please follow these steps:')
            .addFields(
                {
                    name: '1️⃣ Select Category',
                    value: 'Use the dropdown menu above to select your betting category (Numbers, Colors, Even/Odd, etc.)',
                    inline: false
                },
                {
                    name: '2️⃣ Modal Opens',
                    value: 'A modal will open where you can enter your specific bet details and amount',
                    inline: false
                },
                {
                    name: '3️⃣ Confirm Bet',
                    value: 'Submit the modal to place your bet - your balance will be deducted immediately',
                    inline: false
                }
            )
            .setFooter({ text: 'Select a category from the dropdown menu above to get started!' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [instructionEmbed] });
        
    } catch (error) {
        console.error('❌ Add bet handler error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your request.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleLiveRouletteViewBets(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const channelId = interaction.channel.id;
        const userId = interaction.user.id;
        
        // Get user's current bets from LiveRoulette instance
        const liveRouletteInstance = interaction.client.liveRoulette;
        
        if (!liveRouletteInstance || !liveRouletteInstance.isRunning) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Active Session')
                .setDescription('There is no active live roulette session.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        const userBets = liveRouletteInstance.getUserBets(userId);
        
        if (userBets.bets.size === 0) {
            const noBetsEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('📋 Your Bets')
                .setDescription('You haven\'t placed any bets yet this round.')
                .addFields({
                    name: '💡 How to Bet',
                    value: 'Use the dropdown menu to select a betting category, then fill in the modal to place your bet.',
                    inline: false
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [noBetsEmbed] });
            return;
        }
        
        // Format user bets
        let betsText = '';
        let totalBet = 0;
        
        for (const [betType, amount] of userBets.bets) {
            const formattedBetType = betType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            betsText += `• **${formattedBetType}**: ${amount.toFixed(8)} LTC\n`;
            totalBet += amount;
        }
        
        const betsEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📋 Your Current Bets')
            .setDescription('Here are your bets for this round:')
            .addFields(
                {
                    name: '🎯 Your Bets',
                    value: betsText,
                    inline: false
                },
                {
                    name: '💰 Total Bet Amount',
                    value: `${totalBet.toFixed(8)} LTC`,
                    inline: true
                },
                {
                    name: '⏰ Time Left',
                    value: `${liveRouletteInstance.timeLeft} seconds`,
                    inline: true
                }
            )
            .setFooter({ text: 'Good luck! 🍀' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [betsEmbed] });
        
    } catch (error) {
        console.error('❌ View bets handler error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while retrieving your bets.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleLiveRouletteStartTimer(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const channelId = interaction.channel.id;
        const userId = interaction.user.id;
        
        // Check permissions (only session host can start timer)
        const rouletteCommand = require('./commands/roulette.js');
        const liveRouletteSessions = rouletteCommand.liveRouletteSessions;
        
        if (!liveRouletteSessions.has(channelId)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Active Session')
                .setDescription('There is no active roulette session in this channel.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        const session = liveRouletteSessions.get(channelId);
        
        if (session.host !== userId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Permission Denied')
                .setDescription('Only the session host can start the timer.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Start the 60-second countdown using LiveRoulette class
        const liveRouletteInstance = interaction.client.liveRoulette;
        
        if (!liveRouletteInstance) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ System Error')
                .setDescription('Live roulette system not initialized.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Start the live roulette session
        liveRouletteInstance.start(channelId);
        
        const timerEmbed = new EmbedBuilder()
            .setColor('#ff6b00')
            .setTitle('⏰ 60-Second Timer Started!')
            .setDescription('The betting timer has started! You have **60 seconds** to place your bets.')
            .addFields(
                {
                    name: '📋 Instructions',
                    value: '• Use the dropdown above to select betting categories\n• Place your bets using the modals\n• Betting will close automatically when timer expires',
                    inline: false
                },
                {
                    name: '⏰ Time Remaining',
                    value: '60 seconds',
                    inline: true
                },
                {
                    name: '🎰 What Happens Next',
                    value: 'Wheel will spin automatically when time expires',
                    inline: true
                }
            )
            .setFooter({ text: 'Good luck to all players! 🍀' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [timerEmbed] });
        
        console.log(`⏰ Live roulette 60s timer started in channel ${channelId} by ${interaction.user.username}`);
        
    } catch (error) {
        console.error('❌ Start timer handler error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while starting the timer.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleLiveRouletteEndSession(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        const channelId = interaction.channel.id;
        const userId = interaction.user.id;
        
        // Check permissions (only session host can end session)
        const rouletteCommand = require('./commands/roulette.js');
        const liveRouletteSessions = rouletteCommand.liveRouletteSessions;
        
        if (!liveRouletteSessions.has(channelId)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Active Session')
                .setDescription('There is no active roulette session in this channel.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        const session = liveRouletteSessions.get(channelId);
        
        if (session.host !== userId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Permission Denied')
                .setDescription('Only the session host can end the session.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }
        
        // Stop the live roulette instance
        const liveRouletteInstance = interaction.client.liveRoulette;
        if (liveRouletteInstance) {
            liveRouletteInstance.stop();
        }
        
        // End the session using the existing function
        await rouletteCommand.endLiveRouletteSession(channelId, interaction.client);
        
        const endEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🛑 Live Roulette Session Ended')
            .setDescription('The live roulette session has been ended by the host.')
            .addFields(
                {
                    name: '💰 Refunds',
                    value: 'All pending bets have been refunded to players\' balances.',
                    inline: false
                },
                {
                    name: '🎮 New Session',
                    value: 'Use `/roulette` to start a new live roulette session.',
                    inline: false
                }
            )
            .setFooter({ text: 'Thank you for playing!' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [endEmbed] });
        
        console.log(`🛑 Live roulette session ended in channel ${channelId} by ${interaction.user.username}`);
        
        // Log session end
        const logManager = require('./utils/logManager.js');
        await logManager.sendGamblingLog(interaction.client, interaction.guild.id, {
            type: 'session_ended',
            user: interaction.user,
            game: 'Live Roulette',
            channel: interaction.channel.name
        });
        
    } catch (error) {
        console.error('❌ End session handler error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while ending the session.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Start live roulette when bot is ready
client.once('ready', () => {
    setTimeout(startLiveRouletteIfConfigured, 5000); // Wait 5 seconds after bot is ready
});

// Fonction de reconnexion automatique
async function startBotWithRetry() {
    const token = process.env.DISCORD_TOKEN;
    
    if (!token) {
        console.error('❌ DISCORD_TOKEN environment variable is required!');
        process.exit(1);
    }
    
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries) {
        try {
            await client.login(token);
            console.log('✅ Bot connecté avec succès!');
            break;
        } catch (error) {
            retryCount++;
            console.error(`❌ Échec de connexion (tentative ${retryCount}/${maxRetries}):`, error.message);
            
            if (retryCount < maxRetries) {
                const delay = retryCount * 5000; // Délai croissant: 5s, 10s, 15s...
                console.log(`⏳ Nouvelle tentative dans ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ Impossible de se connecter après plusieurs tentatives');
                process.exit(1);
            }
        }
    }
}

// Start the bot if this file is run directly
if (require.main === module) {
    startBotWithRetry();
}