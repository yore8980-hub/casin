# 🎰 Litecoin Casino Discord Bot

A complete, production-ready Discord bot for running a Litecoin-based casino with automatic deposit detection, balance management, withdrawal functionality, and real-time currency conversion.

## ✨ Features

### 🎯 Core Casino Features
- **Automatic Deposit Detection**: Real-time monitoring of Litecoin deposits (30-second intervals)
- **Balance Management**: Complete user profile system with transaction history
- **Secure Withdrawals**: Cryptographically secure transaction broadcasting
- **Address Generation**: Unique Litecoin addresses for each user deposit

### 💬 Discord Integration
- **Slash Commands**: Modern Discord slash command interface
- **Interactive Panels**: Button-based casino interface
- **Private Channels**: Auto-created private casino sessions
- **Real-time Notifications**: Instant deposit confirmations via DM

### 💱 Currency Features
- **EUR ⇄ USD Conversion**: Real-time exchange rates
- **LTC Price Display**: Current Litecoin prices in USD/EUR
- **Multi-currency Support**: Formatted currency displays

### 🎮 Gaming Ready
- **Modular Architecture**: Easy to add games (blackjack, roulette, slots)
- **Balance Transfers**: Users can send LTC to each other
- **Leaderboards**: Top players by balance
- **Transaction History**: Complete audit trail

## 🚀 Quick Start

### 1. Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in your configuration:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_application_id_here
   ```

### 2. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token to your `.env` file
5. Go to "General Information" and copy the Application ID
6. Enable required bot permissions:
   - Send Messages
   - Use Slash Commands
   - Manage Channels
   - Read Message History

### 3. API Keys

#### Plus d'API externe requise !
Le bot utilise maintenant une connexion directe aux explorateurs Litecoin publics.
Aucune clé API n'est nécessaire pour les opérations blockchain.

#### Alternative: Bitquery
1. Sign up at [Bitquery](https://bitquery.io/)
2. Get your API key
3. Add to `.env` as `BITQUERY_API_KEY`

### 4. Deploy Commands

```bash
npm run deploy
```

### 5. Start the Bot

```bash
npm start
```

## 📋 Available Commands

### User Commands
- `/casino` - Open the main casino panel
- `/profile` - View your casino profile and stats
- `/balance [@user]` - Check balance (yours or another user's)
- `/givebal @user amount` - Transfer LTC to another user
- `/convert-eur-usd amount` - Convert EUR to USD
- `/convert-usd-eur amount` - Convert USD to EUR

### Interactive Features
- **Add Balance Button**: Generates unique LTC deposit address
- **Create Channel Button**: Creates private casino session
- **Leaderboard**: View top players by balance

## 🏗️ Project Structure

```
├── commands/           # Slash commands
│   ├── casino.js      # Main casino panel
│   ├── profile.js     # User profile display
│   ├── balance.js     # Balance checking
│   ├── givebal.js     # Balance transfers
│   ├── convert-eur-usd.js
│   └── convert-usd-eur.js
├── events/            # Discord event handlers
│   ├── ready.js       # Bot startup & deposit monitoring
│   └── interactionCreate.js
├── utils/             # Utility modules
│   ├── userProfiles.js    # User data management
│   └── currencyConverter.js
├── data/              # JSON data storage
│   ├── user_profiles.json
│   └── address_mapping.json
├── discord-bot.js     # Main Discord bot file
├── litecoin-casino-bot.js # Litecoin wallet system
├── deploy-commands.js # Command deployment script
└── addresses.json     # Generated LTC addresses
```

## 🔧 Core Systems

### Litecoin Wallet System
- **Address Generation**: Uses `litecore-lib` for secure key generation
- **UTXO Management**: Automatic unspent output tracking
- **Transaction Broadcasting**: Direct blockchain submission
- **Balance Monitoring**: Real-time balance updates

### User Profile System
- **Persistent Storage**: JSON-based user data
- **Transaction History**: Complete deposit/withdrawal logs
- **Balance Tracking**: Real-time balance updates
- **Address Linking**: Maps LTC addresses to Discord users

### Deposit Detection
- **Automatic Monitoring**: 30-second interval checks
- **Real-time Notifications**: Instant Discord DMs
- **Balance Updates**: Automatic profile updates
- **Transaction Logging**: Complete audit trail

## 🎮 Adding Casino Games

The bot is designed for easy game integration. Example blackjack implementation:

```javascript
// commands/blackjack.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userProfiles = require('../utils/userProfiles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play blackjack')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Bet amount in LTC')
                .setRequired(true)
                .setMinValue(0.001)
        ),
    
    async execute(interaction) {
        // Game implementation here
        // Deduct bet from user balance
        // Play game logic
        // Update balance based on result
    }
};
```

## 🔒 Security Features

### Private Key Management
- **Local Generation**: Keys never leave your server
- **Secure Storage**: JSON file storage with proper permissions
- **No Exposure**: Private keys never logged or transmitted

### API Security
- **Token Authentication**: All API calls authenticated
- **Rate Limiting**: Respects API limits (3 req/sec BlockCypher)
- **Error Handling**: Graceful degradation on API failures

### Discord Security
- **Permission Validation**: Proper permission checks
- **Ephemeral Responses**: Sensitive data hidden from others
- **DM Notifications**: Private transaction notifications

## 📊 Monitoring & Analytics

### Real-time Statistics
- **Active Users**: Track user engagement
- **Transaction Volume**: Monitor LTC flow
- **Deposit Success Rate**: API reliability metrics
- **Game Performance**: Win/loss statistics (when games added)

### Logging
- **Comprehensive Logs**: All transactions logged
- **Error Tracking**: Detailed error information
- **Performance Metrics**: API response times

## 🔧 Configuration Options

### Environment Variables
```env
# Required
DISCORD_TOKEN=              # Discord bot token
DISCORD_CLIENT_ID=          # Discord application ID
BLOCKCYPHER_TOKEN=          # BlockCypher API token

# Optional
DISCORD_GUILD_ID=           # For development commands
BITQUERY_API_KEY=           # Alternative API
```

### Customization
- **Check Intervals**: Modify deposit checking frequency
- **Fee Rates**: Adjust transaction fees
- **Currencies**: Add more currency pairs
- **Permissions**: Customize channel permissions

## 🚀 Deployment

### Local Development
```bash
npm install
npm run deploy
npm start
```

### Production Deployment
1. Set up environment variables
2. Deploy to your preferred hosting service
3. Ensure persistent file storage for JSON data
4. Set up monitoring and alerts

### Replit Deployment
1. Import this project to Replit
2. Add secrets in the Secrets tab
3. Run the bot using the Run button

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your casino game or feature
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## ⚠️ Disclaimer

This software is for educational and development purposes. Please ensure compliance with local gambling and cryptocurrency regulations before deploying in production.

## 🆘 Support

- **Documentation**: Check this README for common issues
- **Issues**: Report bugs on GitHub
- **Discord**: Join our support server (link in bio)

---

**Built with ❤️ for the crypto casino community**