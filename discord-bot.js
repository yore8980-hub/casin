const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import Litecoin wallet system
const ltcWallet = require('./litecoin-casino-bot.js');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

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
            // Roulette number selection
            if (interaction.customId === 'roulette_bet_number') {
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
});

// Add Balance handler
async function handleAddBalance(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
        // Generate new LTC address for each deposit request (always new address)
        const newAddress = ltcWallet.generateAddress();
        
        if (!newAddress) {
            throw new Error('Failed to generate Litecoin address');
        }
        
        // Link address to user and add to active deposits monitoring
        const userProfiles = require('./utils/userProfiles.js');
        const securityManager = require('./utils/securityManager.js');
        const logManager = require('./utils/logManager.js');
        
        await userProfiles.linkAddressToUser(interaction.user.id, newAddress.address);
        securityManager.addActiveDeposit(interaction.user.id, newAddress.address, 0);
        
        // Log address generation
        await logManager.sendBalanceLog(client, interaction.guild.id, {
            type: 'address_generated',
            user: interaction.user,
            address: newAddress.address
        });
        
        // Start smart monitoring for this deposit
        startSmartMonitoring();
        
        const depositEmbed = new EmbedBuilder()
            .setColor('#f7931a')
            .setTitle('💰 Add Balance - New Litecoin Address')
            .setDescription('Send the amount you want to deposit to the **new unique address** below:')
            .addFields(
                { name: '📍 Deposit Address (NEW)', value: `\`${newAddress.address}\``, inline: false },
                { name: '⏱️ Smart Detection', value: 'Monitoring active - deposits detected within 30 seconds', inline: true },
                { name: '🔄 Status', value: 'Waiting for deposit...', inline: true },
                { name: '🔒 Security', value: 'This address is unique to this deposit request', inline: false }
            )
            .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
            .setFooter({ text: 'Casino Bot • Smart Monitoring Active' })
            .setTimestamp();
        
        await interaction.editReply({ 
            embeds: [depositEmbed]
        });
        
        // Send address as plain text in a separate message
        await interaction.followUp({
            content: `**Adresse de dépôt:** \`${newAddress.address}\`\n\n⚠️ **Important:**\n• Votre balance sera ajoutée une fois le paiement confirmé à **100%**\n• Si après **20 minutes** votre balance n'a toujours pas été ajoutée ou qu'il y a un souci, veuillez ping un staff`,
            ephemeral: false
        });
        
        console.log(`🔍 Surveillance démarrée pour l'adresse ${newAddress.address} (utilisateur ${interaction.user.username})`);
        
    } catch (error) {
        console.error('❌ Add balance error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('Failed to generate deposit address. Please try again.')
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
        console.log('Impossible de notifier l\'utilisateur du dépôt:', error.message);
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