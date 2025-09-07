const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const commands = [];

// Load all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  Command ${file} is missing required properties`);
    }
}

// Deploy commands
async function deployCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID; // Optional: for guild-specific commands
    
    if (!token) {
        console.error('❌ DISCORD_TOKEN is required!');
        process.exit(1);
    }
    
    if (!clientId) {
        console.error('❌ DISCORD_CLIENT_ID is required!');
        process.exit(1);
    }
    
    const rest = new REST().setToken(token);
    
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);
        
        let data;
        
        if (guildId) {
            // Deploy to specific guild (faster for development)
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} guild commands for guild ${guildId}.`);
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} global application commands.`);
        }
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

// Run deployment if this file is executed directly
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };