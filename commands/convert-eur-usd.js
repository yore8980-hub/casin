const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const currencyConverter = require('../utils/currencyConverter.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convert-eur-usd')
        .setDescription('Convert EUR to USD')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount in EUR to convert')
                .setRequired(true)
                .setMinValue(0.01)
        ),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const amount = interaction.options.getNumber('amount');
            
            // Perform currency conversion
            const conversion = await currencyConverter.convertCurrency(amount, 'EUR', 'USD');
            
            const conversionEmbed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('💱 Currency Conversion')
                .setDescription('**EUR → USD**')
                .addFields(
                    {
                        name: '🇪🇺 Euro Amount',
                        value: `€${conversion.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        inline: true
                    },
                    {
                        name: '🇺🇸 US Dollar Equivalent',
                        value: `$${conversion.convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        inline: true
                    },
                    {
                        name: '📊 Exchange Rate',
                        value: `1 EUR = $${conversion.exchangeRate.toFixed(4)} USD`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Exchange rates are updated in real-time' 
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [conversionEmbed] });
            
        } catch (error) {
            console.error('EUR to USD conversion error:', error);
            
            let errorMessage = 'Failed to convert currency. Please try again later.';
            
            if (error.message.includes('Amount must be greater than 0')) {
                errorMessage = 'Please enter a valid amount greater than 0.';
            } else if (error.message.includes('Failed to fetch exchange rate')) {
                errorMessage = 'Currency conversion service is temporarily unavailable.';
            }
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Conversion Failed')
                .setDescription(errorMessage)
                .addFields({
                    name: '💡 Tip',
                    value: 'Exchange rates are fetched from external APIs. Please try again in a few moments.',
                    inline: false
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};