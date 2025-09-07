const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casino')
        .setDescription('Open the casino main panel'),
    
    async execute(interaction) {
        // Check if interaction is too old
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 10 * 60 * 1000) {
            console.log('Interaction trop ancienne, ignorée');
            return;
        }
        
        try {
            const casinoEmbed = new EmbedBuilder()
                .setColor('#f7931a')
                .setTitle('🎰 Litecoin Casino')
                .setDescription('Welcome to the Litecoin Casino! Choose an option below to get started.')
                .addFields(
                    {
                        name: '💰 Add Balance',
                        value: 'Generate a unique Litecoin address to deposit funds',
                        inline: true
                    },
                    {
                        name: '🎮 Games Available',
                        value: 'Blackjack, Roulette - Start playing now!',
                        inline: true
                    },
                    {
                        name: '📊 Profile',
                        value: 'View your balance and transaction history',
                        inline: true
                    }
                )
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setImage('https://i.imgur.com/9KpZK8h.png') // Casino banner (optional)
                .setFooter({ text: 'Secure • Fast • Transparent' })
                .setTimestamp();
            
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('add_balance')
                        .setLabel('💰 Add Balance')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰'),
                    new ButtonBuilder()
                        .setCustomId('view_profile')
                        .setLabel('👤 Profile')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👤'),
                    new ButtonBuilder()
                        .setCustomId('leaderboard')
                        .setLabel('🏆 Leaderboard')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏆')
                );
            
            // Games row (now functional!)
            const gamesRow = new ActionRowBuilder()
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
                        .setDisabled(true) // Coming soon
                );
            
            await interaction.reply({ 
                embeds: [casinoEmbed], 
                components: [actionRow, gamesRow]
            });
            
        } catch (error) {
            console.error('Casino command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to load casino panel. Please try again.')
                .setTimestamp();
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            } catch (replyError) {
                console.error('Impossible de répondre à l\'erreur casino:', replyError.message);
            }
        }
    }
};