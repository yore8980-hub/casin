const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, '../data/gaming_sessions.json');

class SessionManager {
    constructor() {
        this.activeSessions = new Map();
        this.loadSessions();
    }

    loadSessions() {
        try {
            if (fs.existsSync(SESSIONS_FILE)) {
                const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
                // Convert array to Map and check for expired sessions
                const now = Date.now();
                data.forEach(session => {
                    if (session.expiresAt > now) {
                        this.activeSessions.set(session.id, session);
                    }
                });
                console.log(`✅ Loaded ${this.activeSessions.size} active gaming sessions`);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.activeSessions = new Map();
        }
    }

    saveSessions() {
        try {
            const sessionsArray = Array.from(this.activeSessions.values());
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsArray, null, 2));
        } catch (error) {
            console.error('Error saving sessions:', error);
        }
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async createPrivateSession(guild, host, sessionType = 'general', options = {}) {
        const sessionId = this.generateSessionId();
        const channelName = `🎰-${host.username}-${sessionType}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        
        try {
            // Create private channel
            const channel = await guild.channels.create({
                name: channelName,
                type: 0, // Text channel
                topic: `🎰 Private Gaming Session | Host: ${host.username} | Type: ${sessionType}`,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: host.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ]
            });

            // Create session object
            const session = {
                id: sessionId,
                channelId: channel.id,
                hostId: host.id,
                guildId: guild.id,
                sessionType: sessionType,
                participants: [host.id],
                createdAt: Date.now(),
                expiresAt: Date.now() + (options.duration || 60) * 60 * 1000, // Default 1 hour
                settings: {
                    maxParticipants: options.maxParticipants || 10,
                    isPublic: options.isPublic || false,
                    allowSpectators: options.allowSpectators || true,
                    minBet: options.minBet || 0.001,
                    maxBet: options.maxBet || 1.0
                },
                stats: {
                    totalGames: 0,
                    totalWagers: 0,
                    participantCount: 1
                }
            };

            this.activeSessions.set(sessionId, session);
            this.saveSessions();

            // Send welcome message
            await this.sendSessionWelcome(channel, session, host);

            return { success: true, session, channel };

        } catch (error) {
            console.error('Error creating private session:', error);
            return { success: false, error: error.message };
        }
    }

    async sendSessionWelcome(channel, session, host) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🎉 Private Gaming Session Created!')
            .setDescription(`Welcome to your exclusive gaming room, ${host}!`)
            .addFields(
                {
                    name: '🎮 Session Details',
                    value: `**Type:** ${session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)}\n**Host:** ${host.username}\n**Max Players:** ${session.settings.maxParticipants}\n**Duration:** ${Math.round((session.expiresAt - session.createdAt) / 60000)} minutes`,
                    inline: true
                },
                {
                    name: '💰 Betting Limits',
                    value: `**Minimum:** ${session.settings.minBet} LTC\n**Maximum:** ${session.settings.maxBet} LTC\n**Spectators:** ${session.settings.allowSpectators ? 'Allowed' : 'Not Allowed'}`,
                    inline: true
                },
                {
                    name: '🎯 Available Games',
                    value: '🃏 Blackjack\n🎰 Roulette\n🎲 Dice Games\n🎮 Group Games',
                    inline: false
                }
            )
            .setThumbnail(host.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Session ID: ${session.id}` })
            .setTimestamp();

        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`session_invite_${session.id}`)
                    .setLabel('👥 Invite Players')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId(`session_settings_${session.id}`)
                    .setLabel('⚙️ Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId(`session_stats_${session.id}`)
                    .setLabel('📊 Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        const gamesRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`session_blackjack_${session.id}`)
                    .setLabel('🃏 Blackjack')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🃏'),
                new ButtonBuilder()
                    .setCustomId(`session_roulette_${session.id}`)
                    .setLabel('🎰 Roulette')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎰'),
                new ButtonBuilder()
                    .setCustomId(`session_close_${session.id}`)
                    .setLabel('🚪 Close Session')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚪')
            );

        await channel.send({
            embeds: [welcomeEmbed],
            components: [controlRow, gamesRow]
        });
    }

    async addParticipant(sessionId, userId, guild) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return { success: false, reason: 'Session not found' };

        if (session.participants.includes(userId)) {
            return { success: false, reason: 'User already in session' };
        }

        if (session.participants.length >= session.settings.maxParticipants) {
            return { success: false, reason: 'Session is full' };
        }

        try {
            const channel = guild.channels.cache.get(session.channelId);
            if (!channel) return { success: false, reason: 'Channel not found' };

            // Add permissions for the new participant
            await channel.permissionOverwrites.create(userId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            // Update session
            session.participants.push(userId);
            session.stats.participantCount = session.participants.length;
            this.saveSessions();

            // Announce new participant
            const user = await guild.members.fetch(userId);
            const joinEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎊 New Player Joined!')
                .setDescription(`${user} has joined the gaming session!`)
                .addFields({
                    name: '👥 Current Players',
                    value: `${session.participants.length}/${session.settings.maxParticipants}`,
                    inline: true
                })
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await channel.send({ embeds: [joinEmbed] });

            return { success: true };
        } catch (error) {
            console.error('Error adding participant:', error);
            return { success: false, reason: error.message };
        }
    }

    async removeParticipant(sessionId, userId, guild, removedBy = null) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return { success: false, reason: 'Session not found' };

        if (!session.participants.includes(userId)) {
            return { success: false, reason: 'User not in session' };
        }

        try {
            const channel = guild.channels.cache.get(session.channelId);
            if (!channel) return { success: false, reason: 'Channel not found' };

            // Remove permissions
            await channel.permissionOverwrites.delete(userId);

            // Update session
            session.participants = session.participants.filter(id => id !== userId);
            session.stats.participantCount = session.participants.length;

            // If host left, transfer ownership or close session
            if (userId === session.hostId) {
                if (session.participants.length > 0) {
                    session.hostId = session.participants[0];
                    const newHost = await guild.members.fetch(session.hostId);
                    
                    const transferEmbed = new EmbedBuilder()
                        .setColor('#f39c12')
                        .setTitle('👑 Host Transfer')
                        .setDescription(`${newHost} is now the session host!`)
                        .setTimestamp();

                    await channel.send({ embeds: [transferEmbed] });
                } else {
                    // Close session if no participants left
                    await this.closeSession(sessionId, guild);
                    return { success: true, sessionClosed: true };
                }
            } else {
                // Announce participant left
                const user = await guild.members.fetch(userId);
                const leaveEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('👋 Player Left')
                    .setDescription(`${user.username} has left the gaming session`)
                    .addFields({
                        name: '👥 Remaining Players',
                        value: `${session.participants.length}/${session.settings.maxParticipants}`,
                        inline: true
                    })
                    .setTimestamp();

                if (removedBy && removedBy !== userId) {
                    const remover = await guild.members.fetch(removedBy);
                    leaveEmbed.setFooter({ text: `Removed by ${remover.username}` });
                }

                await channel.send({ embeds: [leaveEmbed] });
            }

            this.saveSessions();
            return { success: true };
        } catch (error) {
            console.error('Error removing participant:', error);
            return { success: false, reason: error.message };
        }
    }

    async closeSession(sessionId, guild) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return { success: false, reason: 'Session not found' };

        try {
            const channel = guild.channels.cache.get(session.channelId);
            
            if (channel) {
                // Send closing message
                const closeEmbed = new EmbedBuilder()
                    .setColor('#95a5a6')
                    .setTitle('🔒 Session Ending')
                    .setDescription('This gaming session is being closed...')
                    .addFields(
                        {
                            name: '📊 Session Stats',
                            value: `**Total Games:** ${session.stats.totalGames}\n**Total Wagers:** ${session.stats.totalWagers.toFixed(8)} LTC\n**Participants:** ${session.stats.participantCount}`,
                            inline: true
                        },
                        {
                            name: '⏰ Duration',
                            value: `${Math.round((Date.now() - session.createdAt) / 60000)} minutes`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [closeEmbed] });

                // Delete channel after 10 seconds
                setTimeout(async () => {
                    try {
                        await channel.delete('Gaming session ended');
                    } catch (error) {
                        console.error('Error deleting session channel:', error);
                    }
                }, 10000);
            }

            // Remove from active sessions
            this.activeSessions.delete(sessionId);
            this.saveSessions();

            return { success: true };
        } catch (error) {
            console.error('Error closing session:', error);
            return { success: false, reason: error.message };
        }
    }

    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    isUserInSession(userId) {
        for (const session of this.activeSessions.values()) {
            if (session.participants.includes(userId)) {
                return session;
            }
        }
        return null;
    }

    async cleanExpiredSessions(guild) {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, session] of this.activeSessions) {
            if (session.expiresAt <= now) {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            await this.closeSession(sessionId, guild);
            console.log(`🧹 Cleaned expired session: ${sessionId}`);
        }

        return expiredSessions.length;
    }
}

module.exports = new SessionManager();