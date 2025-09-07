# 🚀 Quick Setup Guide

## 1. Get Your API Keys

### Discord Bot Setup
1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name
3. Go to "Bot" section → "Add Bot"
4. Copy the **Token** (this is your `DISCORD_TOKEN`)
5. Go back to "General Information" → Copy the **Application ID** (this is your `DISCORD_CLIENT_ID`)
6. Go to "Bot" → Enable these permissions:
   - Send Messages
   - Use Slash Commands
   - Manage Channels
   - Read Message History

### BlockCypher API (Free)
1. Sign up at https://www.blockcypher.com/
2. Get your free API token (allows 3 requests/second)
3. This is your `BLOCKCYPHER_TOKEN`

## 2. Configure Environment

Add these secrets in Replit:
- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application ID
- `BLOCKCYPHER_TOKEN` - Your BlockCypher API token

## 3. Invite Bot to Server

Use this URL (replace YOUR_CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268528640&scope=bot%20applications.commands
```

## 4. Deploy Commands

Run this once to register slash commands:
```bash
npm run deploy
```

## 5. Start the Bot

```bash
npm start
```

## 🎯 Quick Test

1. In Discord, type `/casino` to open the main panel
2. Click "💰 Add Balance" to generate a Litecoin address
3. Send a small amount of LTC to test deposit detection
4. Use `/profile` to view your balance

## 🔧 Troubleshooting

- **"DISCORD_TOKEN is required"**: Add your Discord token to secrets
- **Commands not showing**: Run `npm run deploy` first
- **No deposit detection**: Check if `BLOCKCYPHER_TOKEN` is set correctly
- **Permission errors**: Make sure bot has required permissions in your server

## 🎮 Ready Features

### 🔒 Security System
- ✅ Password-protected accounts (`/setpassword`)
- ✅ Recovery key system (`/recoverykey`)
- ✅ Timed gambling sessions (`/enable`)
- ✅ 100% wagering requirement before cashout

### 💰 Financial System  
- ✅ Smart deposit monitoring (only when needed)
- ✅ Unique addresses for each deposit
- ✅ Secure password-protected withdrawals (`/cashout`)
- ✅ Balance management and transfers
- ✅ Currency conversion (EUR/USD)

### 🎰 Casino Features
- ✅ User profiles and statistics
- ✅ Private channel creation
- ✅ Test gambling system (`/testgamble`)
- 🚧 Games (blackjack, roulette) - Ready for implementation

## 📱 Example Usage

### Initial Setup
```
User: /setpassword mypassword123
Bot: ✅ Password set! Recovery key: A1B2C3D4E5F6...

User: /casino
Bot: [Shows casino panel with Add Balance button]
```

### Adding Balance
```
User: [Clicks Add Balance]
Bot: Send LTC to: LxxxxxxxxxxxxxxxxxxxxxxxxxxxX
     [NEW unique address generated]

User: [Sends 0.01 LTC]
Bot: ✅ Deposit confirmed! 0.01 LTC added
     Note: Must wager 100% before cashout
```

### Gambling Session
```
User: /enable 30 mypassword123
Bot: ✅ Gambling session active for 30 minutes

User: /testgamble 0.005
Bot: 🎉 You won! +0.009 LTC
     Cashout progress: 50% complete
```

### Secure Cashout
```
User: /cashout LxxxDestinationxxx 0.015 mypassword123
Bot: ✅ Withdrawal successful! TXID: abc123...
```

Your casino bot is now ready! 🎰