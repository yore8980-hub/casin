const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ownertransfer')
        .setDescription('🔑 Owner only: Transfer balance between any users')
        .addUserOption(option =>
            option.setName('fromuser')
                .setDescription('User to transfer FROM')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('touser')
                .setDescription('User to transfer TO')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to transfer (in LTC)')
                .setRequired(true)
                .setMinValue(0.00000001)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        try {
            // Check if user is owner
            if (interaction.user.id !== process.env.OWNER_ID) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Accès Refusé')
                    .setDescription('Cette commande est réservée au propriétaire du bot.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            const fromUser = interaction.options.getUser('fromuser');
            const toUser = interaction.options.getUser('touser');
            const amount = parseFloat(interaction.options.getNumber('amount'));

            // Validate amount
            if (amount <= 0 || isNaN(amount)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Montant Invalide')
                    .setDescription('Le montant doit être supérieur à 0.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Get user profiles
            const fromProfile = userProfiles.getUserProfile(fromUser.id);
            const toProfile = userProfiles.getUserProfile(toUser.id);

            // Check if fromUser has sufficient balance
            if (fromProfile.balance < amount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('❌ Fonds Insuffisants')
                    .setDescription(`${fromUser.username} n'a que ${fromProfile.balance.toFixed(8)} LTC disponible.`)
                    .addFields({
                        name: '💰 Détails',
                        value: `**Demandé:** ${amount.toFixed(8)} LTC\n**Disponible:** ${fromProfile.balance.toFixed(8)} LTC\n**Manquant:** ${(amount - fromProfile.balance).toFixed(8)} LTC`,
                        inline: false
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Perform the transfer
            const oldFromBalance = fromProfile.balance;
            const oldToBalance = toProfile.balance;

            fromProfile.balance -= amount;
            toProfile.balance += amount;

            // Update profiles
            userProfiles.updateUserProfile(fromUser.id, fromProfile);
            userProfiles.updateUserProfile(toUser.id, toProfile);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ Transfert Réalisé')
                .setDescription(`**${amount.toFixed(8)} LTC** transféré avec succès!`)
                .addFields(
                    {
                        name: '📤 Émetteur',
                        value: `**${fromUser.username}**\n*Ancien:* ${oldFromBalance.toFixed(8)} LTC\n*Nouveau:* ${fromProfile.balance.toFixed(8)} LTC`,
                        inline: true
                    },
                    {
                        name: '📥 Destinataire',
                        value: `**${toUser.username}**\n*Ancien:* ${oldToBalance.toFixed(8)} LTC\n*Nouveau:* ${toProfile.balance.toFixed(8)} LTC`,
                        inline: true
                    },
                    {
                        name: '🔗 Transaction',
                        value: `**Montant:** ${amount.toFixed(8)} LTC\n**Par:** ${interaction.user.username}\n**Type:** Transfert Owner`,
                        inline: false
                    }
                )
                .setThumbnail('https://cryptologos.cc/logos/litecoin-ltc-logo.png')
                .setFooter({ text: `🔑 Transfert autorisé par le propriétaire` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            console.log(`💸 Owner transfer: ${amount.toFixed(8)} LTC from ${fromUser.username} to ${toUser.username} by ${interaction.user.username}`);

        } catch (error) {
            console.error('Owner transfer error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Erreur de Transfert')
                .setDescription('Une erreur est survenue lors du transfert.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};