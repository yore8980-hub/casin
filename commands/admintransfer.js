const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');
const { formatLTC } = require('../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admintransfer')
        .setDescription('[ADMIN] Transfer balance between any users')
        .addUserOption(option =>
            option.setName('from')
                .setDescription('User to transfer balance from')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('to')
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
            // Check if user is the bot owner
            const ownerId = process.env.OWNER_ID;
            
            if (!ownerId || interaction.user.id !== ownerId) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Access Denied')
                    .setDescription('Only the bot owner can perform admin transfers.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            const fromUser = interaction.options.getUser('from');
            const toUser = interaction.options.getUser('to');
            const amount = interaction.options.getNumber('amount');
            const fromUserId = fromUser.id;
            const toUserId = toUser.id;
            
            // Validation checks
            if (fromUserId === toUserId) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Transfer')
                    .setDescription('Cannot transfer balance to the same user!')
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
                    .setDescription(`${fromUser.username} doesn't have enough balance!\n\n**Current Balance:** ${formatLTC(senderProfile.balance)} LTC\n**Required:** ${formatLTC(amount)} LTC`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            
            // Perform the admin transfer
            const transfer = userProfiles.transferBalance(fromUserId, toUserId, amount);
            
            // Get updated profiles
            const updatedSenderProfile = userProfiles.getUserProfile(fromUserId);
            const updatedReceiverProfile = userProfiles.getUserProfile(toUserId);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('✅ Admin Transfer Successful')
                .setDescription(`Successfully transferred **${formatLTC(amount)} LTC** from ${fromUser} to ${toUser}`)
                .addFields(
                    {
                        name: '👤 From',
                        value: `${fromUser.username}\n**New Balance:** ${formatLTC(updatedSenderProfile.balance)} LTC`,
                        inline: true
                    },
                    {
                        name: '👤 To',
                        value: `${toUser.username}\n**New Balance:** ${formatLTC(updatedReceiverProfile.balance)} LTC`,
                        inline: true
                    },
                    {
                        name: '🛡️ Admin Details',
                        value: `**Executed by:** ${interaction.user.username}\n**Amount:** ${formatLTC(amount)} LTC\n**Date:** ${new Date(transfer.timestamp).toLocaleString()}\n**ID:** ${transfer.timestamp}`,
                        inline: false
                    }
                )
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setFooter({ text: 'Admin Transfer - Owner Command' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Try to notify both users
            try {
                // Notify the sender
                const senderDM = await fromUser.createDM();
                const senderNotification = new EmbedBuilder()
                    .setColor('#ff6600')
                    .setTitle('⚠️ Admin Transfer Notice')
                    .setDescription(`An admin has transferred **${formatLTC(amount)} LTC** from your account to ${toUser.username}`)
                    .addFields({
                        name: '💳 Your New Balance',
                        value: `${formatLTC(updatedSenderProfile.balance)} LTC`,
                        inline: true
                    })
                    .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                    .setTimestamp();
                
                await senderDM.send({ embeds: [senderNotification] });
            } catch (dmError) {
                console.log('Could not send DM to sender:', dmError.message);
            }

            try {
                // Notify the receiver
                const receiverDM = await toUser.createDM();
                const receiverNotification = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('💰 Admin Transfer Received')
                    .setDescription(`You received **${formatLTC(amount)} LTC** via admin transfer from ${fromUser.username}`)
                    .addFields({
                        name: '💳 Your New Balance',
                        value: `${formatLTC(updatedReceiverProfile.balance)} LTC`,
                        inline: true
                    })
                    .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                    .setTimestamp();
                
                await receiverDM.send({ embeds: [receiverNotification] });
            } catch (dmError) {
                console.log('Could not send DM to receiver:', dmError.message);
            }
            
        } catch (error) {
            console.error('Admin transfer command error:', error);
            
            let errorMessage = 'Failed to process admin transfer. Please try again.';
            
            if (error.message === 'Insufficient balance') {
                errorMessage = 'Insufficient balance for this transfer.';
            }
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Admin Transfer Failed')
                .setDescription(errorMessage)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};