/**
 * Ticket Manager for Casino Bot
 * Handles creation and management of private ticket channels
 */

const fs = require('fs');
const TICKETS_FILE = './data/tickets.json';

/**
 * Get default tickets data
 */
function getDefaultData() {
    return {
        activeTickets: {},
        ticketCounter: 0
    };
}

/**
 * Load tickets data
 */
function loadTickets() {
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        
        if (fs.existsSync(TICKETS_FILE)) {
            const data = fs.readFileSync(TICKETS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des tickets:', error);
    }
    
    return getDefaultData();
}

/**
 * Save tickets data
 */
function saveTickets(data) {
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des tickets:', error);
        return false;
    }
}

/**
 * Create a private ticket channel for user
 */
async function createTicket(guild, user, categoryId, staffRoleId, ticketType = 'general') {
    try {
        const data = loadTickets();
        
        // Check if user already has an active ticket
        const existingTicket = Object.values(data.activeTickets).find(ticket => 
            ticket.userId === user.id && ticket.type === ticketType
        );
        
        if (existingTicket) {
            try {
                const existingChannel = guild.channels.cache.get(existingTicket.channelId);
                if (existingChannel) {
                    return { 
                        success: false, 
                        error: 'existing',
                        channel: existingChannel 
                    };
                } else {
                    // Channel doesn't exist anymore, remove from data
                    delete data.activeTickets[existingTicket.ticketId];
                    saveTickets(data);
                }
            } catch (error) {
                console.log('Erreur vérification channel existant:', error);
            }
        }
        
        // Increment counter and create ticket ID
        data.ticketCounter++;
        const ticketId = `ticket-${data.ticketCounter}`;
        
        // Determine ticket name based on type
        const ticketNames = {
            'balance': '💰-balance',
            'profile': '👤-profile', 
            'general': '🎫-casino'
        };
        
        const channelName = `${ticketNames[ticketType] || '🎫-casino'}-${user.username}`.toLowerCase();
        
        // Set up permissions
        const permissionOverwrites = [
            {
                id: guild.id, // @everyone
                deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            },
            {
                id: user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks']
            }
        ];
        
        // Add staff role permissions if provided
        if (staffRoleId) {
            permissionOverwrites.push({
                id: staffRoleId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks', 'ManageMessages']
            });
        }
        
        // Create the channel
        const channel = await guild.channels.create({
            name: channelName,
            type: 0, // Text channel
            topic: `Private ${ticketType} session for ${user.username} • Ticket ID: ${ticketId}`,
            parent: categoryId,
            permissionOverwrites: permissionOverwrites
        });
        
        // Save ticket data
        data.activeTickets[ticketId] = {
            ticketId,
            channelId: channel.id,
            userId: user.id,
            username: user.username,
            type: ticketType,
            createdAt: Date.now(),
            staffRoleId
        };
        
        saveTickets(data);
        
        return {
            success: true,
            channel,
            ticketId
        };
        
    } catch (error) {
        console.error('Erreur création ticket:', error);
        return {
            success: false,
            error: 'create_failed'
        };
    }
}

/**
 * Close a ticket channel
 */
async function closeTicket(ticketId, guild) {
    try {
        const data = loadTickets();
        const ticket = data.activeTickets[ticketId];
        
        if (!ticket) {
            return { success: false, error: 'not_found' };
        }
        
        // Try to delete the channel
        try {
            const channel = guild.channels.cache.get(ticket.channelId);
            if (channel) {
                await channel.delete();
            }
        } catch (error) {
            console.log('Erreur suppression channel:', error);
        }
        
        // Remove from data
        delete data.activeTickets[ticketId];
        saveTickets(data);
        
        return { success: true };
        
    } catch (error) {
        console.error('Erreur fermeture ticket:', error);
        return { success: false, error: 'close_failed' };
    }
}

/**
 * Get ticket by channel ID
 */
function getTicketByChannel(channelId) {
    const data = loadTickets();
    return Object.values(data.activeTickets).find(ticket => 
        ticket.channelId === channelId
    );
}

/**
 * Get ticket by user ID and type
 */
function getTicketByUser(userId, ticketType = null) {
    const data = loadTickets();
    return Object.values(data.activeTickets).find(ticket => 
        ticket.userId === userId && (ticketType ? ticket.type === ticketType : true)
    );
}

/**
 * Get all active tickets
 */
function getAllTickets() {
    const data = loadTickets();
    return data.activeTickets;
}

/**
 * Clean up old/invalid tickets
 */
async function cleanupTickets(guild) {
    try {
        const data = loadTickets();
        let cleanedCount = 0;
        
        for (const [ticketId, ticket] of Object.entries(data.activeTickets)) {
            try {
                const channel = guild.channels.cache.get(ticket.channelId);
                if (!channel) {
                    // Channel doesn't exist, remove ticket
                    delete data.activeTickets[ticketId];
                    cleanedCount++;
                }
            } catch (error) {
                // Error checking channel, remove ticket
                delete data.activeTickets[ticketId];
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            saveTickets(data);
            console.log(`🧹 Nettoyé ${cleanedCount} ticket(s) invalide(s)`);
        }
        
        return cleanedCount;
        
    } catch (error) {
        console.error('Erreur nettoyage tickets:', error);
        return 0;
    }
}

module.exports = {
    createTicket,
    closeTicket,
    getTicketByChannel,
    getTicketByUser,
    getAllTickets,
    cleanupTickets
};