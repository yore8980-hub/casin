const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`🎰 Bot Casino Discord prêt! Connecté en tant que ${client.user.tag}`);
        console.log(`🔗 Connecté à ${client.guilds.cache.size} serveur(s)`);
        console.log(`👥 Au service de ${client.users.cache.size} utilisateur(s)`);
        
        // Set bot status
        client.user.setActivity('🎰 Litecoin Casino | /casino', { type: 'PLAYING' });
        
        // Initialize smart monitoring if there are active deposits
        checkAndStartSmartMonitoring(client);
    },
};

/**
 * Check for active deposits and start smart monitoring if needed
 */
function checkAndStartSmartMonitoring(client) {
    const securityManager = require('../utils/securityManager.js');
    const { startSmartMonitoring } = require('../discord-bot.js');
    
    // Check if there are any active deposits
    const activeDeposits = securityManager.getAllActiveDeposits();
    
    if (activeDeposits.length > 0) {
        console.log(`🔍 ${activeDeposits.length} dépôt(s) actif(s) trouvé(s) - démarrage de la surveillance intelligente`);
        startSmartMonitoring();
    } else {
        console.log('ℹ️  Aucun dépôt actif trouvé - la surveillance démarrera quand nécessaire');
    }
}