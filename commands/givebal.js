const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');
const { formatLTC } = require('../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givebal')
        .setDescription('Transfer balance to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to transfer balance to')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to transfer (in LTC)')
                .setRequired(true)
                .setMinValue(0.00000001)
        ),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getNumber('amount');
            const fromUserId = interaction.user.id;
            const toUserId = targetUser.id;
            
            // Validation checks
            if (fromUserId === toUserId) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Transfer')
                    .setDescription('You cannot transfer balance to yourself!')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            if (amount <= 0) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Amount')
                    .setDescription('Amount must be greater than 0!')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Check sender's balance
            const senderProfile = userProfiles.getUserProfile(fromUserId);
            
            if (senderProfile.balance < amount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Balance')
                    .setDescription(`You don't have enough balance!\n\n**Your Balance:** ${formatLTC(senderProfile.balance)} LTC\n**Required:** ${formatLTC(amount)} LTC`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Perform the transfer
            const transfer = userProfiles.transferBalance(fromUserId, toUserId, amount);
            
            // Get updated profiles
            const updatedSenderProfile = userProfiles.getUserProfile(fromUserId);
            const updatedReceiverProfile = userProfiles.getUserProfile(toUserId);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Transfer Successful')
                .setDescription(`Successfully transferred **${formatLTC(amount)} LTC** to ${targetUser}`)
                .addFields(
                    {
                        name: '👤 From',
                        value: `${interaction.user}\n**New Balance:** ${formatLTC(updatedSenderProfile.balance)} LTC`,
                        inline: true
                    },
                    {
                        name: '👤 To',
                        value: `${targetUser}\n**New Balance:** ${formatLTC(updatedReceiverProfile.balance)} LTC`,
                        inline: true
                    },
                    {
                        name: '📋 Transaction Details',
                        value: `**Amount:** ${formatLTC(amount)} LTC\n**Date:** ${new Date(transfer.timestamp).toLocaleString()}\n**ID:** ${transfer.timestamp}`,
                        inline: false
                    }
                )
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Try to notify the receiver (if they share a server)
            try {
                const receiverDM = await targetUser.createDM();
                
                const notificationEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('💰 Balance Received')
                    .setDescription(`You received **${amount.toFixed(8)} LTC** from ${interaction.user.username}!`)
                    .addFields({
                        name: '💳 Your New Balance',
                        value: `${updatedReceiverProfile.balance.toFixed(8)} LTC`,
                        inline: true
                    })
                    .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                    .setTimestamp();
                
                await receiverDM.send({ embeds: [notificationEmbed] });
            } catch (dmError) {
                console.log('Could not send DM notification:', dmError.message);
                // This is not critical, so we don't show error to user
            }
            
        } catch (error) {
            console.error('Transfer command error:', error);
            
            let errorMessage = 'Failed to process transfer. Please try again.';
            
            if (error.message === 'Insufficient balance') {
                errorMessage = 'Insufficient balance for this transfer.';
            }
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Transfer Failed')
                .setDescription(errorMessage)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};