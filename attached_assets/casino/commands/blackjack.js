const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');
const securityManager = require('../utils/securityManager.js');
const logManager = require('../utils/logManager.js');
const { formatLTC } = require('../utils/formatters.js');

// Card deck
const suits = ['♠️', '♥️', '♦️', '♣️'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Active games storage
const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play Blackjack against the dealer')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet in LTC')
                .setRequired(true)
                .setMinValue(0.001)
        ),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction trop ancienne, ignorée');
            return;
        }
        
        await interaction.deferReply({ ephemeral: false });
        
        try {
            const bet = interaction.options.getNumber('bet');
            const userId = interaction.user.id;
            
            // Check if user has active game
            if (activeGames.has(userId)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Game Already Active')
                    .setDescription('You already have an active blackjack game. Finish it first!')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Get user profile and verify balance
            const profile = userProfiles.getUserProfile(userId);
            
            if (profile.balance < bet) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Balance')
                    .setDescription(`You need **${formatLTC(bet)} LTC** to play but only have **${formatLTC(profile.balance)} LTC**.`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check password protection
            const userSec = securityManager.getUserSecurity(userId);
            if (!userSec.hasPassword) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🔒 Password Required')
                    .setDescription('You need to set a password before gambling. Use `/setpassword` first.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Deduct bet from balance
            userProfiles.updateUserProfile(userId, { 
                balance: profile.balance - bet 
            });
            
            // Add wagered amount
            securityManager.addWageredAmount(userId, bet);
            
            // Create new game
            const game = createNewGame(bet, userId);
            activeGames.set(userId, game);
            
            // Deal initial cards
            dealInitialCards(game);
            
            // Create game embed
            const gameEmbed = createGameEmbed(game, interaction.user);
            const gameButtons = createGameButtons(game);
            
            await interaction.editReply({ 
                embeds: [gameEmbed],
                components: [gameButtons]
            });
            
            // Auto-timeout after 2 minutes
            setTimeout(() => {
                if (activeGames.has(userId)) {
                    const timeoutGame = activeGames.get(userId);
                    if (timeoutGame.status === 'playing') {
                        timeoutGame.status = 'timeout';
                        activeGames.delete(userId);
                        console.log(`🕐 Blackjack game timed out for ${interaction.user.username}`);
                    }
                }
            }, 120000); // 2 minutes
            
        } catch (error) {
            console.error('Erreur blackjack:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while starting the blackjack game.')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

function createNewGame(bet, userId) {
    return {
        userId: userId,
        bet: bet,
        deck: createDeck(),
        playerHand: [],
        dealerHand: [],
        playerValue: 0,
        dealerValue: 0,
        status: 'playing', // playing, won, lost, push, timeout
        canDoubleDown: true,
        startTime: Date.now()
    };
}

function createDeck() {
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCard(game) {
    return game.deck.pop();
}

function dealInitialCards(game) {
    // Deal 2 cards to player and dealer
    game.playerHand.push(dealCard(game));
    game.dealerHand.push(dealCard(game));
    game.playerHand.push(dealCard(game));
    game.dealerHand.push(dealCard(game));
    
    game.playerValue = calculateHandValue(game.playerHand);
    game.dealerValue = calculateHandValue(game.dealerHand);
    
    // Check for natural blackjack
    if (game.playerValue === 21) {
        if (game.dealerValue === 21) {
            game.status = 'push'; // Tie
        } else {
            game.status = 'blackjack'; // Player blackjack
        }
    }
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
        if (card.rank === 'A') {
            aces++;
            value += 11;
        } else if (['J', 'Q', 'K'].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    }
    
    // Handle aces
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    
    return value;
}

function formatHand(hand, hideFirst = false) {
    return hand.map((card, index) => {
        if (hideFirst && index === 0) {
            return '🃏';
        }
        return `${card.rank}${card.suit}`;
    }).join(' ');
}

function createGameEmbed(game, user) {
    const playerHandStr = formatHand(game.playerHand);
    const dealerHandStr = formatHand(game.dealerHand, game.status === 'playing');
    
    let title = '🃏 Blackjack Game';
    let color = '#f7931a';
    let description = `Bet: **${formatLTC(game.bet)} LTC**`;
    
    if (game.status === 'won') {
        title = '🎉 You Win!';
        color = '#00ff00';
        description = `You won **${formatLTC(game.bet * 2)} LTC**!`;
    } else if (game.status === 'lost') {
        title = '💸 You Lost';
        color = '#ff0000';
        description = `You lost **${formatLTC(game.bet)} LTC**`;
    } else if (game.status === 'push') {
        title = '🤝 Push (Tie)';
        color = '#ffaa00';
        description = `Your bet of **${formatLTC(game.bet)} LTC** has been returned`;
    } else if (game.status === 'blackjack') {
        title = '🎯 BLACKJACK!';
        color = '#ffd700';
        description = `You won **${formatLTC(game.bet * 2.5)} LTC** with Blackjack!`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .addFields(
            {
                name: `👤 ${user.username}'s Hand (${game.playerValue})`,
                value: playerHandStr,
                inline: false
            },
            {
                name: `🎰 Dealer's Hand ${game.status === 'playing' ? '(?)' : `(${game.dealerValue})`}`,
                value: dealerHandStr,
                inline: false
            }
        )
        .setFooter({ text: 'Good luck!' })
        .setTimestamp();
    
    if (game.status !== 'playing') {
        const profile = userProfiles.getUserProfile(game.userId);
        embed.addFields({
            name: '💰 New Balance',
            value: `${formatLTC(profile.balance)} LTC`,
            inline: true
        });
    }
    
    return embed;
}

function createGameButtons(game) {
    const row = new ActionRowBuilder();
    
    if (game.status === 'playing') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('blackjack_hit')
                .setLabel('Hit')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎯'),
            new ButtonBuilder()
                .setCustomId('blackjack_stand')
                .setLabel('Stand')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✋')
        );
        
        if (game.canDoubleDown && game.playerHand.length === 2) {
            const profile = userProfiles.getUserProfile(game.userId);
            if (profile.balance >= game.bet) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('blackjack_double')
                        .setLabel('Double Down')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰')
                );
            }
        }
    }
    
    return row;
}

// Export game functions for button handlers
module.exports.activeGames = activeGames;
module.exports.calculateHandValue = calculateHandValue;
module.exports.dealCard = dealCard;
module.exports.createGameEmbed = createGameEmbed;
module.exports.createGameButtons = createGameButtons;
module.exports.formatHand = formatHand;