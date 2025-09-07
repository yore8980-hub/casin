/**
 * Panel Manager for Casino Bot
 * Manages channel configurations and panel systems
 */

const fs = require('fs');

const CONFIG_FILE = './data/panel_config.json';

/**
 * Get default configuration
 */
function getDefaultConfig() {
    return {
        panels: {
            casinoPanel: {
                channelId: null,
                messageId: null,
                ticketCategory: null,
                staffRole: null
            },
            addBalancePanel: {
                channelId: null,
                messageId: null,
                ticketCategory: null,
                staffRole: null
            }
        },
        whitelist: {
            serverIds: [],
            adminRoles: []
        }
    };
}

/**
 * Load panel configuration
 */
function loadConfig() {
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la config des panels:', error);
    }
    
    return getDefaultConfig();
}

/**
 * Save panel configuration
 */
function saveConfig(config) {
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('✅ Configuration des panels sauvegardée');
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde config panels:', error);
        return false;
    }
}

/**
 * Set channel for a specific panel type
 */
function setPanelChannel(panelType, channelId, categoryId = null, staffRole = null) {
    const config = loadConfig();
    
    if (!config.panels[panelType]) {
        config.panels[panelType] = {
            channelId: null,
            messageId: null,
            ticketCategory: null,
            staffRole: null
        };
    }
    
    config.panels[panelType].channelId = channelId;
    if (categoryId) config.panels[panelType].ticketCategory = categoryId;
    if (staffRole) config.panels[panelType].staffRole = staffRole;
    
    return saveConfig(config);
}

/**
 * Get panel configuration for a specific type
 */
function getPanelConfig(panelType) {
    const config = loadConfig();
    return config.panels[panelType] || null;
}

/**
 * Check if user/server is whitelisted for panel management
 */
function isWhitelisted(serverId, userId, userRoles) {
    const config = loadConfig();
    
    // Check server whitelist
    if (!config.whitelist.serverIds.includes(serverId)) {
        return false;
    }
    
    // Check admin roles
    if (config.whitelist.adminRoles.length > 0) {
        const hasAdminRole = config.whitelist.adminRoles.some(roleId => 
            userRoles.includes(roleId)
        );
        return hasAdminRole;
    }
    
    return true; // If no admin roles defined, allow all users in whitelisted servers
}

/**
 * Add server to whitelist
 */
function addToWhitelist(serverId, adminRoleId = null) {
    const config = loadConfig();
    
    if (!config.whitelist.serverIds.includes(serverId)) {
        config.whitelist.serverIds.push(serverId);
    }
    
    if (adminRoleId && !config.whitelist.adminRoles.includes(adminRoleId)) {
        config.whitelist.adminRoles.push(adminRoleId);
    }
    
    return saveConfig(config);
}

/**
 * Remove server from whitelist
 */
function removeFromWhitelist(serverId) {
    const config = loadConfig();
    
    config.whitelist.serverIds = config.whitelist.serverIds.filter(id => id !== serverId);
    
    return saveConfig(config);
}

/**
 * Set message ID for panel (after sending)
 */
function setPanelMessageId(panelType, messageId) {
    const config = loadConfig();
    
    if (config.panels[panelType]) {
        config.panels[panelType].messageId = messageId;
        return saveConfig(config);
    }
    
    return false;
}

/**
 * Get all panel configurations
 */
function getAllPanels() {
    const config = loadConfig();
    return config.panels;
}

module.exports = {
    loadConfig,
    saveConfig,
    setPanelChannel,
    getPanelConfig,
    isWhitelisted,
    addToWhitelist,
    removeFromWhitelist,
    setPanelMessageId,
    getAllPanels
};