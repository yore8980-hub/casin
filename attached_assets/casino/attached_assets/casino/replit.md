# Overview

This project is a complete Litecoin casino Discord bot system built with Node.js and Discord.js v14+. The application provides full wallet management including address generation, deposit monitoring, withdrawal capabilities, and a complete Discord bot interface with slash commands, interactive panels, and real-time notifications. The system integrates BlockCypher API for fast blockchain interactions and litecore-lib for cryptographic operations. The bot features automatic deposit detection, balance management, currency conversion, user profiles, and is designed as a foundation for casino gaming features like blackjack and roulette.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Application Structure
The application follows a modular Discord bot architecture with separate command handlers, event listeners, and utility modules. The system includes both a standalone Litecoin wallet system and a complete Discord bot integration with slash commands, interactive panels, and real-time user notifications.

## Discord Bot Architecture
- **Main Bot File**: `discord-bot.js` - Central Discord client and interaction handling
- **Commands System**: Modular slash commands in `/commands/` directory
- **Events System**: Discord event handlers in `/events/` directory
- **User Profiles**: Complete user management system with balance tracking
- **Currency Conversion**: Real-time EUR/USD exchange rates with external APIs

## Address Management System
- **Address Generation**: Uses litecore-lib to create cryptographically secure Litecoin address pairs
- **Data Persistence**: JSON file-based storage system for addresses and private keys
- **Address Structure**: Each address record contains the public address, private key, creation timestamp, and balance tracking

## Blockchain Integration
- **Direct Library Integration**: Uses litecore-lib and direct blockchain explorers, eliminating API rate limits and costs
- **Network Configuration**: Configured for Litecoin mainnet (LTC) operations
- **Real-time Monitoring**: 2-minute interval deposit detection with Discord notifications
- **No External API Dependencies**: Completely self-contained system without third-party API costs

## File System Design
- **Configuration Management**: Environment-based API key handling with fallback defaults
- **Data Storage**: JSON-based persistence with error handling and data validation
- **Modular Functions**: Clear separation between address generation, loading, and saving operations

## Security Considerations
- Private keys are generated using cryptographically secure random number generation
- Local file storage for sensitive data (suitable for development, would need enhancement for production)
- API key configuration system for secure third-party service integration

# External Dependencies

## Discord Integration
- **discord.js**: Discord API wrapper v14+ for bot functionality, slash commands, and interactions
- **Discord Bot Features**: Slash commands, button interactions, embed messages, and real-time notifications

## Blockchain Libraries
- **litecore-lib**: Core Litecoin cryptographic library for address generation and private key management
- **Direct Blockchain Integration**: Direct connection to blockchain explorers without paid APIs
- **No Rate Limits**: Unlimited transactions and monitoring without API restrictions

## HTTP and Utility Libraries  
- **axios**: HTTP client for API communications with blockchain and currency services
- **dotenv**: Environment variable management for secure API key storage
- **Node.js fs module**: File system operations for local data persistence

## Currency APIs
- **ExchangeRate-API**: Real-time currency conversion for EUR/USD pairs
- **CoinGecko API**: Cryptocurrency price data for Litecoin USD/EUR prices

## Development Dependencies
- **@types/node**: TypeScript definitions for Node.js development support

## Implemented Features
The Discord bot includes complete casino functionality with:

### Core Casino System
- User profiles with balance tracking and recovery systems
- Complete deposit detection and monitoring with direct blockchain integration
- Currency conversion between EUR/USD with real-time exchange rates
- Secure password protection system with recovery keys
- Enhanced balance display (shows "0" instead of "0.00000000" for zero balances)

### Panel and Ticket Management System
- **Panel Management**: Channel-specific casino panels that can be configured with `/setpanel`
- **Ticket System**: Private ticket channels created when users interact with panels (similar to TicketTool)
- **Whitelist System**: Server whitelisting with `/addwhitelist` command for panel management
- **Smart Interactions**: Panel buttons (`panel_add_balance`, `panel_view_profile`) create private channels for users

### Advanced Features
- **Rate Limit Protection**: Smart API rate limiting with 8-second delays and proper 429 error handling
- **French Console Logs**: Console output in French while maintaining English user interface
- **Robust Error Handling**: Automatic reconnection system preventing bot disconnections
- **Private Channel Management**: Automatic ticket cleanup and category organization
- **Active Deposit Management**: `/stopallactives` command to manage monitoring

### Available Slash Commands (20 total)
- `/balance`, `/profile`, `/casino` - Core user functions
- `/setpassword`, `/changepassword`, `/recoverykey` - Security system  
- `/givebal`, `/cashout` - Balance management
- `/setpanel`, `/addwhitelist` - Panel and server management
- `/convert-eur-usd`, `/convert-usd-eur` - Currency tools
- `/enable`, `/stopallactives` - Monitoring controls
- `/testgamble`, `/resetrecovery` - Testing and recovery
- `/blackjack`, `/roulette` - Casino games
- `/setlogbal`, `/setloggamble` - Logging configuration

### Casino Games System (New!)
- **Blackjack Game**: Complete blackjack implementation with hit, stand, and double down mechanics
- **Roulette Game**: Full European roulette with number bets (35:1), color bets (1:1), and even/odd bets (1:1)
- **Game State Management**: Active games tracking with 2-minute auto-timeout
- **Interactive Controls**: Button-based gameplay with real-time updates
- **Comprehensive Logging**: All game results logged to configured channels

### Enhanced Deposit System
- **Always New Addresses**: Each deposit request generates a completely new address
- **Enhanced Channel Management**: Private channels with auto-close after 20 minutes
- **Non-Ephemeral Messages**: Deposit addresses sent as normal messages for easy copying
- **Staff Ping Instructions**: Clear 20-minute timeout warnings with staff ping guidance
- **Advanced Logging**: Comprehensive logging system for all deposit and gambling activities

### Logging System (New!)
- **Balance Log Channel**: Configure with `/setlogbal` for deposit confirmations and address generations
- **Gambling Log Channel**: Configure with `/setloggamble` for game results and big wins
- **Automated Big Win Detection**: Special notifications for wins 5x or larger
- **Channel Auto-Management**: Automatic ticket cleanup and category organization

The system is now production-ready with complete casino functionality including blackjack and roulette games, enhanced user experience, and comprehensive logging systems.