// Enhanced Multi-Gaming Discord Bot with Premium Customization
// Install dependencies: npm install discord.js@14 dotenv node-cron
// Requires Node.js 18 or higher

require('dotenv').config();

const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Initialize bot with enhanced intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

// Cooldowns and temporary storage
client.cooldowns = new Collection();
client.tempVoiceCategories = new Collection();

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LFG_FILE = path.join(DATA_DIR, 'lfg.json');
const THEMES_FILE = path.join(DATA_DIR, 'themes.json');
const CUSTOM_COMMANDS_FILE = path.join(DATA_DIR, 'custom_commands.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Enhanced Data Management Class
class DataManager {
  constructor() {
    this.profiles = this.loadData(PROFILES_FILE, {});
    this.games = this.loadData(GAMES_FILE, {});
    this.settings = this.loadData(SETTINGS_FILE, {});
    this.lfgPosts = this.loadData(LFG_FILE, {});
    this.themes = this.loadData(THEMES_FILE, {});
    this.customCommands = this.loadData(CUSTOM_COMMANDS_FILE, {});
  }

  loadData(filepath, defaultValue) {
    try {
      if (fs.existsSync(filepath)) {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
      }
    } catch (error) {
      console.error(`Error loading ${filepath}:`, error);
    }
    return defaultValue;
  }

  saveData(filepath, data) {
    try {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving ${filepath}:`, error);
      return false;
    }
  }

  // Profile methods
  getProfile(userId, guildId) {
    const key = `${guildId}-${userId}`;
    return this.profiles[key] || null;
  }

  createProfile(userId, guildId, data = {}) {
    const key = `${guildId}-${userId}`;
    this.profiles[key] = {
      userId,
      guildId,
      createdAt: new Date().toISOString(),
      gamertag: data.gamertag || null,
      bio: data.bio || '',
      timezone: data.timezone || 'UTC',
      pronouns: data.pronouns || '',
      favoriteGames: data.favoriteGames || [],
      gamePreferences: {
        genres: data.gamePreferences?.genres || [],
        playstyle: data.gamePreferences?.playstyle || 'casual',
        competitiveLevel: data.gamePreferences?.competitiveLevel || 'casual',
        communication: data.gamePreferences?.communication || 'text',
        availability: data.gamePreferences?.availability || 'evenings'
      },
      skills: data.skills || {},
      playstyle: data.playstyle || '',
      availability: data.availability || {},
      socials: data.socials || {},
      achievements: [],
      stats: {
        gamesPlayed: 0,
        hoursPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        winStreak: 0,
        bestWinStreak: 0,
        rank: 'Unranked',
        favoriteRole: 'Flex'
      },
      preferences: {
        notifications: true,
        publicProfile: true,
        showStats: true,
        autoJoinEvents: false,
        theme: 'default',
        compactMode: false,
        LFGNotifications: true
      },
      level: 1,
      xp: 0,
      reputation: 0,
      ...data
    };
    this.saveData(PROFILES_FILE, this.profiles);
    return this.profiles[key];
  }

  updateProfile(userId, guildId, updates) {
    const key = `${guildId}-${userId}`;
    if (this.profiles[key]) {
      this.profiles[key] = { ...this.profiles[key], ...updates };
      this.saveData(PROFILES_FILE, this.profiles);
      return this.profiles[key];
    }
    return null;
  }

  addGameToProfile(userId, guildId, gameName, gameData) {
    const profile = this.getProfile(userId, guildId);
    if (profile) {
      if (!profile.games) profile.games = {};
      profile.games[gameName] = {
        ...gameData,
        addedAt: new Date().toISOString()
      };
      this.saveData(PROFILES_FILE, this.profiles);
      return true;
    }
    return false;
  }

  // Game methods
  getGame(guildId, gameName) {
    return this.games[`${guildId}-${gameName.toLowerCase()}`] || null;
  }

  getGameByCategory(guildId, categoryId) {
    return Object.values(this.games).find(game => 
      game.guildId === guildId && game.categoryId === categoryId
    );
  }

  getAllGames(guildId) {
    return Object.values(this.games).filter(g => g.guildId === guildId);
  }

  addGame(guildId, gameName, categoryId, channels, config = {}) {
    const key = `${guildId}-${gameName.toLowerCase()}`;
    this.games[key] = {
      guildId,
      name: gameName,
      categoryId,
      channels,
      roles: config.autoRole ? [config.autoRole] : [],
      config: {
        emoji: config.emoji || '🎮',
        color: config.color || '#5865F2',
        requireRole: config.requireRole || false,
        autoRole: config.autoRole || null,
        welcomeMessage: config.welcomeMessage || null,
        announcements: config.announcements || true,
        LFGChannel: config.LFGChannel || null
      },
      createdAt: new Date().toISOString()
    };
    this.saveData(GAMES_FILE, this.games);
    return this.games[key];
  }

  updateGame(guildId, gameName, updates) {
    const key = `${guildId}-${gameName.toLowerCase()}`;
    if (this.games[key]) {
      this.games[key] = { ...this.games[key], ...updates };
      this.saveData(GAMES_FILE, this.games);
      return this.games[key];
    }
    return null;
  }

  deleteGame(guildId, gameName) {
    const key = `${guildId}-${gameName.toLowerCase()}`;
    if (this.games[key]) {
      delete this.games[key];
      this.saveData(GAMES_FILE, this.games);
      return true;
    }
    return false;
  }

  // Settings methods
  getSettings(guildId) {
    return this.settings[guildId] || this.getDefaultSettings(guildId);
  }

  getDefaultSettings(guildId) {
    return {
      guildId,
      prefix: '!',
      welcomeChannel: null,
      logChannel: null,
      defaultRole: null,
      embedColor: '#5865F2',
      timezone: 'UTC',
      language: 'en',
      automod: {
        antiSpam: false,
        antiRaid: false,
        linkFilter: false,
        allowedLinks: []
      }
    };
  }

  updateSettings(guildId, updates) {
    if (!this.settings[guildId]) {
      this.settings[guildId] = this.getDefaultSettings(guildId);
    }
    this.settings[guildId] = { ...this.settings[guildId], ...updates };
    this.saveData(SETTINGS_FILE, this.settings);
    return this.settings[guildId];
  }

  // Theme methods
  createTheme(guildId, themeData) {
    const themeId = `${guildId}-${Date.now()}`;
    this.themes[themeId] = {
      id: themeId,
      guildId,
      ...themeData,
      createdAt: new Date().toISOString()
    };
    this.saveData(THEMES_FILE, this.themes);
    return this.themes[themeId];
  }

  getThemes(guildId) {
    return Object.values(this.themes).filter(theme => theme.guildId === guildId);
  }

  deleteTheme(themeId) {
    if (this.themes[themeId]) {
      delete this.themes[themeId];
      this.saveData(THEMES_FILE, this.themes);
      return true;
    }
    return false;
  }

  // Custom command methods
  createCustomCommand(guildId, commandData) {
    const commandId = `${guildId}-${Date.now()}`;
    this.customCommands[commandId] = {
      id: commandId,
      guildId,
      ...commandData,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };
    this.saveData(CUSTOM_COMMANDS_FILE, this.customCommands);
    return this.customCommands[commandId];
  }

  getCustomCommands(guildId) {
    return Object.values(this.customCommands).filter(cmd => cmd.guildId === guildId);
  }

  deleteCustomCommand(commandId) {
    if (this.customCommands[commandId]) {
      delete this.customCommands[commandId];
      this.saveData(CUSTOM_COMMANDS_FILE, this.customCommands);
      return true;
    }
    return false;
  }

  // LFG System Methods
  createLFGPost(guildId, postData) {
    const lfgId = `${guildId}-${Date.now()}`;
    this.lfgPosts[lfgId] = {
      id: lfgId,
      guildId,
      ...postData,
      participants: [],
      pendingRequests: [],
      messageId: null,
      privateChannels: null,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    this.saveData(LFG_FILE, this.lfgPosts);
    return this.lfgPosts[lfgId];
  }

  getLFGPost(lfgId) {
    return this.lfgPosts[lfgId] || null;
  }

  updateLFGPost(lfgId, updates) {
    if (this.lfgPosts[lfgId]) {
      this.lfgPosts[lfgId] = { ...this.lfgPosts[lfgId], ...updates };
      this.saveData(LFG_FILE, this.lfgPosts);
      return this.lfgPosts[lfgId];
    }
    return null;
  }

  addParticipant(lfgId, userId) {
    const post = this.getLFGPost(lfgId);
    if (!post) return false;

    if (!post.participants.includes(userId)) {
      post.participants.push(userId);
      this.updateLFGPost(lfgId, { participants: post.participants });
      return true;
    }
    return false;
  }

  removeParticipant(lfgId, userId) {
    const post = this.getLFGPost(lfgId);
    if (!post) return false;

    post.participants = post.participants.filter(p => p !== userId);
    this.updateLFGPost(lfgId, { participants: post.participants });
    return true;
  }

  getAllLFGPosts(guildId) {
    return Object.values(this.lfgPosts).filter(post => post.guildId === guildId && post.status === 'active');
  }

  getLFGPostsByGame(guildId, gameName) {
    return Object.values(this.lfgPosts).filter(post => 
      post.guildId === guildId && 
      post.status === 'active' && 
      post.game.toLowerCase() === gameName.toLowerCase()
    );
  }
}

const dataManager = new DataManager();

// Theme system
const DEFAULT_THEMES = {
  default: {
    name: 'Default',
    colors: {
      primary: '#5865F2',
      success: '#57F287',
      warning: '#FEE75C',
      error: '#ED4245',
      background: '#2F3136',
      text: '#FFFFFF'
    },
    emojis: {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#1E1E1E',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000',
      background: '#121212',
      text: '#E0E0E0'
    }
  },
  gaming: {
    name: 'Gaming',
    colors: {
      primary: '#FF6B00',
      success: '#00FF88',
      warning: '#FFD700',
      error: '#FF4444',
      background: '#1A1A2E',
      text: '#FFFFFF'
    },
    emojis: {
      success: '🎮',
      error: '💀',
      warning: '⚡',
      info: '👾'
    }
  },
  cyber: {
    name: 'Cyber',
    colors: {
      primary: '#00FFFF',
      success: '#00FF88',
      warning: '#FF00FF',
      error: '#FF0066',
      background: '#0A0A0A',
      text: '#00FFFF'
    }
  }
};

// Utility functions
function getTheme(guildId, themeName = 'default') {
  return DEFAULT_THEMES[themeName] || DEFAULT_THEMES.default;
}

function createEmbed(title, description, color = '#5865F2', guildId = null) {
  const theme = guildId ? getTheme(guildId) : DEFAULT_THEMES.default;
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || theme.colors.primary)
    .setTimestamp();
}

function createButtonRow(buttons) {
  const row = new ActionRowBuilder();
  buttons.forEach(button => {
    row.addComponents(button);
  });
  return row;
}

// Game genres for MMO, MOBA, and competitive games
const GAME_GENRES = {
  mmo: {
    name: 'MMO/RPG',
    examples: ['World of Warcraft', 'Final Fantasy XIV', 'Elder Scrolls Online', 'Guild Wars 2'],
    roles: ['Tank', 'Healer', 'DPS', 'Support', 'Flex'],
    playstyles: ['Hardcore Raiding', 'Casual', 'PvP', 'Roleplay', 'Crafting/Gathering']
  },
  moba: {
    name: 'MOBA',
    examples: ['League of Legends', 'Dota 2', 'Smite', 'Heroes of the Storm'],
    roles: ['Top', 'Jungle', 'Mid', 'ADC', 'Support', 'Fill'],
    playstyles: ['Ranked Competitive', 'Casual', 'ARAM', 'Tournament', 'Learning']
  },
  fps: {
    name: 'FPS/Competitive',
    examples: ['Valorant', 'CS:GO', 'Overwatch 2', 'Apex Legends', 'Call of Duty'],
    roles: ['Entry Fragger', 'Support', 'AWPer', 'IGL', 'Flex', 'Lurker'],
    playstyles: ['Ranked', 'Casual', 'Scrims', 'Tournament', 'Practice']
  },
  other: {
    name: 'Other Games',
    examples: ['Various competitive and cooperative games'],
    roles: ['Any Role', 'Flex', 'Specific Role'],
    playstyles: ['Competitive', 'Casual', 'Learning', 'For Fun']
  }
};

// Achievement System
const ACHIEVEMENTS = {
  first_profile: {
    name: 'First Steps',
    description: 'Create your first profile',
    icon: '🌱',
    xp: 50
  },
  lfg_creator: {
    name: 'Matchmaker',
    description: 'Create 10 LFG posts',
    icon: '🎯',
    xp: 100
  },
  social_butterfly: {
    name: 'Social Butterfly',
    description: 'Join 20 different LFG groups',
    icon: '🦋',
    xp: 150
  },
  veteran: {
    name: 'Veteran Gamer',
    description: 'Reach level 20',
    icon: '🎖️',
    xp: 200
  },
  winner: {
    name: 'Born to Win',
    description: 'Win 50 matches',
    icon: '🏆',
    xp: 250
  },
  mmo_expert: {
    name: 'MMO Legend',
    description: 'Participate in 25 MMO LFG groups',
    icon: '⚔️',
    xp: 175
  },
  moba_pro: {
    name: 'MOBA Master',
    description: 'Participate in 25 MOBA LFG groups',
    icon: '🎯',
    xp: 175
  },
  fps_champion: {
    name: 'FPS Champion',
    description: 'Participate in 25 FPS LFG groups',
    icon: '🔫',
    xp: 175
  }
};

function awardAchievement(userId, guildId, achievementId) {
  const profile = dataManager.getProfile(userId, guildId);
  if (!profile) return null;

  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return null;

  if (!profile.achievements) profile.achievements = [];
  if (profile.achievements.includes(achievementId)) return null;

  profile.achievements.push(achievementId);
  addXP(userId, guildId, achievement.xp);
  dataManager.updateProfile(userId, guildId, profile);

  return achievement;
}

// XP System
function calculateXPForLevel(level) {
  return level * 100 + Math.pow(level, 2) * 50;
}

function addXP(userId, guildId, xpAmount) {
  const profile = dataManager.getProfile(userId, guildId);
  if (!profile) return null;

  let newXP = profile.xp + xpAmount;
  let newLevel = profile.level;
  
  while (newXP >= calculateXPForLevel(newLevel)) {
    newXP -= calculateXPForLevel(newLevel);
    newLevel++;
  }

  dataManager.updateProfile(userId, guildId, {
    xp: newXP,
    level: newLevel
  });

  return { newLevel, newXP, levelUp: newLevel > profile.level };
}

// Enhanced LFG system with private channels
async function createPrivateLFGChannels(lfgPost, guild) {
  try {
    // Create private category for this LFG group
    const category = await guild.channels.create({
      name: `🔒 LFG-${lfgPost.game}-${lfgPost.id.slice(-6)}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: lfgPost.creatorId, // LFG creator
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: client.user.id, // Bot
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages]
        }
      ],
      reason: `Private channels for LFG: ${lfgPost.game}`
    });

    // Add moderators/admin roles to see the channels
    const moderatorRoles = guild.roles.cache.filter(role => 
      role.permissions.has(PermissionFlagsBits.ManageMessages) || 
      role.permissions.has(PermissionFlagsBits.Administrator)
    );
    
    for (const [_, role] of moderatorRoles) {
      await category.permissionOverwrites.create(role, {
        ViewChannel: true,
        Connect: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
    }

    // Create text channel
    const textChannel = await guild.channels.create({
      name: `lfg-chat-${lfgPost.game.toLowerCase()}-${lfgPost.id.slice(-4)}`,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `Private chat for ${lfgPost.game} - ${lfgPost.activity}`,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: lfgPost.creatorId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
        }
      ]
    });

    // Create voice channel
    const voiceChannel = await guild.channels.create({
      name: `🔊 ${lfgPost.game} Voice`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      userLimit: lfgPost.slots > 0 ? lfgPost.slots : 4,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        },
        {
          id: lfgPost.creatorId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels]
        }
      ]
    });

    // Add moderator permissions to both channels
    for (const [_, role] of moderatorRoles) {
      await textChannel.permissionOverwrites.create(role, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
      await voiceChannel.permissionOverwrites.create(role, {
        ViewChannel: true,
        Connect: true,
        Speak: true
      });
    }

    const channels = {
      categoryId: category.id,
      textChannelId: textChannel.id,
      voiceChannelId: voiceChannel.id
    };

    // Save channel info to LFG post
    dataManager.updateLFGPost(lfgPost.id, { privateChannels: channels });

    // Send welcome message in text channel
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`🎮 Welcome to Your ${lfgPost.game} Group!`)
      .setDescription(`This is your private space to coordinate and play together.`)
      .addFields(
        { name: '🎯 Activity', value: lfgPost.activity, inline: true },
        { name: '👥 Group Size', value: `${lfgPost.participants.length}/${lfgPost.slots}`, inline: true },
        { name: '🔊 Voice Channel', value: `<#${voiceChannel.id}>`, inline: true },
        { name: '⏰ Auto-Delete', value: 'Channels will auto-delete after 24 hours of inactivity', inline: false }
      )
      .setColor('#00FF00')
      .setTimestamp();

    await textChannel.send({ 
      content: `👋 <@${lfgPost.creatorId}> - Your private group is ready!`,
      embeds: [welcomeEmbed] 
    });

    return channels;

  } catch (error) {
    console.error('Error creating private LFG channels:', error);
    return null;
  }
}

// Add user to private channel permissions
async function addUserToPrivateChannels(guildId, channels, userId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const textChannel = guild.channels.cache.get(channels.textChannelId);
    const voiceChannel = guild.channels.cache.get(channels.voiceChannelId);

    if (textChannel) {
      await textChannel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
    }

    if (voiceChannel) {
      await voiceChannel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        Connect: true,
        Speak: true
      });
    }

    // Welcome the new user in text channel
    if (textChannel) {
      await textChannel.send({
        content: `👋 <@${userId}> has joined the group! Welcome! 🎉`
      }).catch(() => {});
    }

  } catch (error) {
    console.error('Error adding user to private channels:', error);
  }
}

// Auto-call users to voice channel
async function autoCallToVoice(lfgPost, channels) {
  try {
    const guild = client.guilds.cache.get(lfgPost.guildId);
    const voiceChannel = guild.channels.cache.get(channels.voiceChannelId);
    const textChannel = guild.channels.cache.get(channels.textChannelId);

    if (!voiceChannel || !textChannel) return;

    const allParticipants = [lfgPost.creatorId, ...lfgPost.participants];
    const mentionString = allParticipants.map(id => `<@${id}>`).join(' ');

    const callEmbed = new EmbedBuilder()
      .setTitle('🎧 Group Complete!')
      .setDescription(`Your ${lfgPost.game} group is ready! Join the voice channel to start playing together.`)
      .addFields(
        { name: '🔊 Voice Channel', value: `${voiceChannel}`, inline: true },
        { name: '👥 Players', value: `${allParticipants.length} members`, inline: true }
      )
      .setColor('#5865F2')
      .setTimestamp();

    // Send call notification in private text channel
    await textChannel.send({
      content: mentionString,
      embeds: [callEmbed]
    }).catch(() => {});

  } catch (error) {
    console.error('Error in auto-call:', error);
  }
}

// Enhanced LFG reaction handling
async function handleJoinReaction(lfgPost, user, message) {
  // Prevent self-joining
  if (user.id === lfgPost.creatorId) {
    const dmChannel = await user.createDM();
    await dmChannel.send({
      content: "❌ You can't join your own LFG post!"
    }).catch(() => {});
    return;
  }

  // Check if already in participants
  const isParticipant = lfgPost.participants.includes(user.id);
  
  if (isParticipant) {
    return;
  }

  // Check slot availability
  const currentParticipants = lfgPost.participants.length;
  if (lfgPost.slots > 0 && currentParticipants >= lfgPost.slots) {
    const dmChannel = await user.createDM();
    await dmChannel.send({
      content: "❌ This LFG post is already full!"
    }).catch(() => {});
    return;
  }

  // Add to participants (auto-join)
  const participants = [...lfgPost.participants, user.id];
  
  dataManager.updateLFGPost(lfgPost.id, { 
    participants,
    lastActivity: new Date().toISOString()
  });

  // Create private channels if they don't exist
  let channels = lfgPost.privateChannels;
  if (!channels && lfgPost.createPrivateChannels !== false) {
    const guild = client.guilds.cache.get(lfgPost.guildId);
    channels = await createPrivateLFGChannels(lfgPost, guild);
  }

  // Add user to channel permissions
  if (channels) {
    await addUserToPrivateChannels(lfgPost.guildId, channels, user.id);
  }

  // Notify both parties
  const creator = await client.users.fetch(lfgPost.creatorId).catch(() => null);
  const joiningUser = user;

  // Notify joining user
  if (joiningUser) {
    const approveEmbed = new EmbedBuilder()
      .setTitle('✅ Joined Group!')
      .setDescription(`You've joined the **${lfgPost.game}** group!`)
      .addFields(
        { name: '👤 Group Creator', value: creator?.username || 'Unknown', inline: true },
        { name: '🎯 Activity', value: lfgPost.activity, inline: true },
        { name: '🕐 Time', value: lfgPost.time, inline: true }
      )
      .setColor('#00FF00')
      .setTimestamp();

    if (channels) {
      approveEmbed.addFields(
        { name: '💬 Private Chat', value: `<#${channels.textChannelId}>`, inline: true },
        { name: '🔊 Voice Channel', value: `<#${channels.voiceChannelId}>`, inline: true }
      );
    }

    await joiningUser.send({ embeds: [approveEmbed] }).catch(() => {});
  }

  // Notify creator
  if (creator) {
    await creator.send({
      content: `✅ **${joiningUser?.username || 'Unknown'}** joined your LFG for **${lfgPost.game}**!` +
               (channels ? `\nThey've been added to your private channels.` : '')
    }).catch(() => {});
  }

  // Update the original LFG message
  await updateLFGEmbed(lfgPost);

  // Public announcement
  const channel = client.channels.cache.get(lfgPost.channelId);
  if (channel) {
    await channel.send({
      content: `🎮 **${joiningUser?.username || 'Unknown'}** joined the LFG for **${lfgPost.game}**! (${participants.length}/${lfgPost.slots} players)`
    }).catch(() => {});
  }

  // Auto-call both users to voice if group is complete
  if (channels && lfgPost.slots > 0 && participants.length >= lfgPost.slots) {
    await autoCallToVoice(lfgPost, channels);
  }
}

// Update LFG embed
async function updateLFGEmbed(lfgPost) {
  const messageId = lfgPost.messageId;
  const channelId = lfgPost.channelId;
  
  if (!messageId || !channelId) return;

  try {
    const channel = client.channels.cache.get(channelId);
    const message = await channel.messages.fetch(messageId);
    
    const participants = lfgPost.participants;
    
    const participantText = participants.length > 0 
      ? participants.map(id => `<@${id}>`).join(', ')
      : 'None yet';

    const originalEmbed = message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(originalEmbed).spliceFields(
      3, 1,
      { name: '✅ Participants', value: participantText, inline: true }
    );

    await message.edit({ embeds: [updatedEmbed] });
  } catch (error) {
    console.error('Error updating LFG embed:', error);
  }
}

// Delete private channels
async function deletePrivateChannels(guildId, channels) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    if (channels.textChannelId) {
      const textChannel = guild.channels.cache.get(channels.textChannelId);
      if (textChannel) await textChannel.delete().catch(() => {});
    }

    if (channels.voiceChannelId) {
      const voiceChannel = guild.channels.cache.get(channels.voiceChannelId);
      if (voiceChannel) await voiceChannel.delete().catch(() => {});
    }

    if (channels.categoryId) {
      const category = guild.channels.cache.get(channels.categoryId);
      if (category) await category.delete().catch(() => {});
    }

  } catch (error) {
    console.error('Error deleting private channels:', error);
  }
}

// Enhanced expiration with notifications
async function expireLFGPost(post, reason) {
  // Update status in database
  dataManager.updateLFGPost(post.id, { 
    status: 'expired',
    expiredAt: new Date().toISOString(),
    expireReason: reason
  });

  // Delete private channels
  if (post.privateChannels) {
    await deletePrivateChannels(post.guildId, post.privateChannels);
  }

  try {
    // Try to find and update the original message
    const channel = client.channels.cache.get(post.channelId);
    if (channel) {
      const message = await channel.messages.fetch(post.messageId).catch(() => null);
      
      if (message) {
        // Create a simple expiration embed
        const expiredEmbed = new EmbedBuilder()
          .setTitle('🔍 LFG Post Expired')
          .setDescription(`This looking for group post has expired and been archived.`)
          .setColor('#FF0000')
          .addFields(
            { name: '🎮 Game', value: post.game, inline: true },
            { name: '🎯 Activity', value: post.activity, inline: true },
            { name: '❌ Status', value: 'Expired', inline: true },
            { name: '📝 Reason', value: reason, inline: true }
          )
          .setFooter({ text: `Expired at ${new Date().toLocaleTimeString()}` })
          .setTimestamp();

        await message.edit({ 
          embeds: [expiredEmbed],
          components: [] // Remove buttons
        });

        // Send expiration notification
        await channel.send({
          content: `⏰ LFG post for **${post.game}** has expired and been archived.`,
          allowedMentions: { parse: [] }
        }).catch(() => {});
      } else {
        // If message doesn't exist, just send notification
        await channel.send({
          content: `⏰ LFG post for **${post.game}** (ID: ${post.id}) has expired and been archived.`,
          allowedMentions: { parse: [] }
        }).catch(() => {});
      }
    }

  } catch (error) {
    console.error('Error expiring LFG post:', error);
  }
}

// Enhanced LFG cleanup with inactivity timer
function cleanupOldLFGPosts() {
  const now = new Date();
  const lfgPosts = dataManager.lfgPosts;

  Object.values(lfgPosts).forEach(async (post) => {
    if (post.status !== 'active') return;

    const postDate = new Date(post.createdAt);
    const hoursSinceCreation = (now - postDate) / (1000 * 60 * 60);
    
    // Check for inactivity (10 minutes since last activity)
    const lastActivity = new Date(post.lastActivity);
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
    
    // Expire if inactive for more than 10 minutes
    if (minutesSinceActivity > 10) {
      await expireLFGPost(post, 'Inactivity timeout (10 minutes)');
    }
    // Expire after 24 hours regardless
    else if (hoursSinceCreation >= 24) {
      await expireLFGPost(post, '24-hour time limit reached');
    }
  });
}

// Cleanup temporary voice categories
function cleanupTempVoiceCategories() {
  const now = Date.now();
  client.tempVoiceCategories.forEach((data, categoryId) => {
    if (now - data.createdAt > 2 * 60 * 60 * 1000) { // 2 hours
      const guild = client.guilds.cache.get(data.guildId);
      if (guild) {
        const category = guild.channels.cache.get(categoryId);
        if (category) {
          category.delete().catch(() => {});
        }
      }
      client.tempVoiceCategories.delete(categoryId);
    }
  });
}

// Check if channel is in a game category
function isInGameCategory(channel, guildId) {
  if (!channel.parentId) return false;
  const game = dataManager.getGameByCategory(guildId, channel.parentId);
  return !!game;
}

// Get game from channel category
function getGameFromChannel(channel, guildId) {
  if (!channel.parentId) return null;
  return dataManager.getGameByCategory(guildId, channel.parentId);
}

// Bot ready event - FIXED: Use clientReady instead of ready
client.once('clientReady', async () => {
  console.log(`🎮 Enhanced Gaming Bot logged in as ${client.user.tag}`);
  
  // Schedule cleanup tasks
  cron.schedule('0 */6 * * *', () => {
    cleanupOldLFGPosts();
    console.log('🧹 Cleaned up old LFG posts');
  });

  cron.schedule('0 */1 * * *', () => {
    cleanupTempVoiceCategories();
    console.log('🧹 Cleaned up temporary voice categories');
  });

  // Cleanup on startup
  cleanupOldLFGPosts();
  cleanupTempVoiceCategories();

  // Register enhanced slash commands - FIXED: Required options before optional ones
  const commands = [
    // Enhanced Profile commands with more options - FIXED ORDER
    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Manage your gaming profile')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create your gaming profile')
          // Required options first
          .addStringOption(opt => opt.setName('gamertag').setDescription('Your main gamertag/username').setRequired(true))
          // Optional options after required ones
          .addStringOption(opt => opt.setName('bio').setDescription('A short bio about yourself').setRequired(false))
          .addStringOption(opt => opt.setName('timezone').setDescription('Your timezone (e.g., EST, PST, UTC)').setRequired(false))
          .addStringOption(opt => opt.setName('pronouns').setDescription('Your pronouns').setRequired(false))
          .addStringOption(opt => 
            opt.setName('playstyle')
              .setDescription('Your preferred playstyle')
              .setRequired(false)
              .addChoices(
                { name: 'Casual', value: 'casual' },
                { name: 'Competitive', value: 'competitive' },
                { name: 'Hardcore', value: 'hardcore' },
                { name: 'Speedrunner', value: 'speedrunner' }
              )
          )
          .addStringOption(opt => 
            opt.setName('primary_genre')
              .setDescription('Your favorite game genre')
              .setRequired(false)
              .addChoices(
                { name: 'MMO/RPG', value: 'mmo' },
                { name: 'MOBA', value: 'moba' },
                { name: 'FPS/Shooter', value: 'fps' },
                { name: 'Strategy', value: 'strategy' },
                { name: 'Battle Royale', value: 'battle_royale' },
                { name: 'Sports/Racing', value: 'sports' }
              )
          )
          .addStringOption(opt => 
            opt.setName('communication')
              .setDescription('Preferred communication method')
              .setRequired(false)
              .addChoices(
                { name: 'Voice Chat', value: 'voice' },
                { name: 'Text Chat', value: 'text' },
                { name: 'Both', value: 'both' }
              )
          )
      )
      .addSubcommand(sub =>
        sub.setName('view')
          .setDescription('View a profile')
          .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false))
      )
      .addSubcommand(sub =>
        sub.setName('edit')
          .setDescription('Edit your profile information')
          // Required options first
          .addStringOption(opt => 
            opt.setName('field')
              .setDescription('Field to edit')
              .setRequired(true)
              .addChoices(
                { name: 'Gamertag', value: 'gamertag' },
                { name: 'Bio', value: 'bio' },
                { name: 'Timezone', value: 'timezone' },
                { name: 'Pronouns', value: 'pronouns' },
                { name: 'Playstyle', value: 'playstyle' },
                { name: 'Favorite Games', value: 'favorite_games' },
                { name: 'Availability', value: 'availability' },
                { name: 'Socials', value: 'socials' },
                { name: 'Communication Method', value: 'communication' },
                { name: 'Competitive Level', value: 'competitive_level' },
                { name: 'Game Genres', value: 'genres' }
              )
          )
          .addStringOption(opt => opt.setName('value').setDescription('New value').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('game')
          .setDescription('Add a game to your profile with detailed info')
          // Required options first
          .addStringOption(opt => opt.setName('name').setDescription('Game name').setRequired(true))
          // Optional options after
          .addStringOption(opt => 
            opt.setName('genre')
              .setDescription('Game genre')
              .setRequired(false)
              .addChoices(
                { name: 'MMO/RPG', value: 'mmo' },
                { name: 'MOBA', value: 'moba' },
                { name: 'FPS/Shooter', value: 'fps' },
                { name: 'Strategy', value: 'strategy' },
                { name: 'Battle Royale', value: 'battle_royale' }
              )
          )
          .addStringOption(opt => opt.setName('rank').setDescription('Your rank/level').setRequired(false))
          .addStringOption(opt => opt.setName('role').setDescription('Your main role').setRequired(false))
          .addIntegerOption(opt => opt.setName('hours').setDescription('Hours played').setRequired(false))
          .addStringOption(opt => 
            opt.setName('skill_level')
              .setDescription('Your skill level in this game')
              .setRequired(false)
              .addChoices(
                { name: 'Beginner', value: 'beginner' },
                { name: 'Intermediate', value: 'intermediate' },
                { name: 'Advanced', value: 'advanced' },
                { name: 'Expert', value: 'expert' }
              )
          )
      )
      .addSubcommand(sub =>
        sub.setName('preferences')
          .setDescription('Update your gaming preferences')
          // All optional since no required fields
          .addStringOption(opt => 
            opt.setName('playstyle')
              .setDescription('Your overall playstyle')
              .setRequired(false)
              .addChoices(
                { name: 'Casual', value: 'casual' },
                { name: 'Competitive', value: 'competitive' },
                { name: 'Hardcore', value: 'hardcore' }
              )
          )
          .addStringOption(opt => 
            opt.setName('availability')
              .setDescription('When you usually play')
              .setRequired(false)
              .addChoices(
                { name: 'Mornings', value: 'mornings' },
                { name: 'Afternoons', value: 'afternoons' },
                { name: 'Evenings', value: 'evenings' },
                { name: 'Late Night', value: 'late_night' },
                { name: 'Weekends', value: 'weekends' }
              )
          )
          .addBooleanOption(opt => opt.setName('lfg_notifications').setDescription('Receive LFG notifications').setRequired(false))
      ),

    // Setup command with role-based access - FIXED ORDER
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Setup a new game category with channels')
      // Required options first
      .addStringOption(opt => opt.setName('game').setDescription('Game name').setRequired(true))
      .addStringOption(opt => 
        opt.setName('channels')
          .setDescription('Channel names (comma-separated, e.g., general,lfg,strategies)')
          .setRequired(true)
      )
      .addBooleanOption(opt => opt.setName('create_role').setDescription('Create a role for this game').setRequired(true))
      // Optional options after required ones
      .addStringOption(opt => opt.setName('emoji').setDescription('Category emoji (e.g., 🎮)').setRequired(false))
      .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g., #FF5733)').setRequired(false))
      .addBooleanOption(opt => opt.setName('create_voice').setDescription('Create voice channels too').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Game management - FIXED ORDER
    new SlashCommandBuilder()
      .setName('game')
      .setDescription('Manage game configurations')
      .addSubcommand(sub =>
        sub.setName('list')
          .setDescription('List all configured games')
      )
      .addSubcommand(sub =>
        sub.setName('info')
          .setDescription('View game configuration')
          .addStringOption(opt => opt.setName('name').setDescription('Game name').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('remove')
          .setDescription('Remove a game setup and all associated channels/roles')
          .addStringOption(opt => opt.setName('name').setDescription('Game name').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('role')
          .setDescription('Assign a role to a game')
          // Required options first
          .addStringOption(opt => opt.setName('name').setDescription('Game name').setRequired(true))
          .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // Enhanced LFG commands with channel restrictions - FIXED ORDER
    new SlashCommandBuilder()
      .setName('lfg')
      .setDescription('Looking for group system')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create a LFG post (must be in game channel)')
          // Required options first
          .addStringOption(opt => opt.setName('activity').setDescription('What are you looking to do?').setRequired(true))
          .addIntegerOption(opt => opt.setName('slots').setDescription('Number of players needed').setRequired(true))
          // Optional options after required ones
          .addStringOption(opt => opt.setName('time').setDescription('When? (e.g., "in 30 minutes", "7pm EST")').setRequired(false))
          .addStringOption(opt => 
            opt.setName('playstyle')
              .setDescription('Playstyle for this session')
              .setRequired(false)
              .addChoices(
                { name: 'Casual', value: 'casual' },
                { name: 'Competitive', value: 'competitive' },
                { name: 'Learning', value: 'learning' },
                { name: 'Speedrun', value: 'speedrun' }
              )
          )
          .addStringOption(opt => opt.setName('requirements').setDescription('Any requirements? (rank, mic, etc.)').setRequired(false))
          .addBooleanOption(opt => opt.setName('private_channels').setDescription('Create private text/voice channels').setRequired(false))
      )
      .addSubcommand(sub =>
        sub.setName('list')
          .setDescription('List active LFG posts')
          .addStringOption(opt => opt.setName('game').setDescription('Filter by specific game').setRequired(false))
      ),

    // Stats tracking - FIXED ORDER
    new SlashCommandBuilder()
      .setName('stats')
      .setDescription('View or update stats')
      .addSubcommand(sub =>
        sub.setName('view')
          .setDescription('View your stats')
          .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false))
      )
      .addSubcommand(sub =>
        sub.setName('log')
          .setDescription('Log a match result')
          // Required options first
          .addStringOption(opt => opt.setName('game').setDescription('Game name').setRequired(true))
          .addStringOption(opt =>
            opt.setName('result')
              .setDescription('Match result')
              .setRequired(true)
              .addChoices(
                { name: 'Win', value: 'win' },
                { name: 'Loss', value: 'loss' },
                { name: 'Draw', value: 'draw' }
              )
          )
          // Optional options after required ones
          .addIntegerOption(opt => opt.setName('duration').setDescription('Match duration in minutes').setRequired(false))
          .addStringOption(opt => opt.setName('role').setDescription('Your role in the match').setRequired(false))
      )
      .addSubcommand(sub =>
        sub.setName('leaderboard')
          .setDescription('View server leaderboard')
          // All optional
          .addStringOption(opt => opt.setName('game').setDescription('Filter by game').setRequired(false))
          .addStringOption(opt => 
            opt.setName('metric')
              .setDescription('Leaderboard metric')
              .setRequired(false)
              .addChoices(
                { name: 'Level', value: 'level' },
                { name: 'Wins', value: 'wins' },
                { name: 'Win Rate', value: 'win_rate' },
                { name: 'Games Played', value: 'games_played' }
              )
          )
      ),

    // Server settings - FIXED ORDER
    new SlashCommandBuilder()
      .setName('settings')
      .setDescription('Configure bot settings')
      .addSubcommand(sub =>
        sub.setName('view')
          .setDescription('View current settings')
      )
      .addSubcommand(sub =>
        sub.setName('welcome')
          .setDescription('Set welcome channel')
          .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('logs')
          .setDescription('Set log channel')
          .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true))
      )
      .addSubcommand(sub =>
        sub.setName('color')
          .setDescription('Set default embed color')
          .addStringOption(opt => opt.setName('hex').setDescription('Hex color code (e.g., #FF5733)').setRequired(true))
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Availability system - FIXED ORDER
    new SlashCommandBuilder()
      .setName('availability')
      .setDescription('Set your gaming availability')
      // Required options first
      .addStringOption(opt =>
        opt.setName('day')
          .setDescription('Day of the week')
          .setRequired(true)
          .addChoices(
            { name: 'Monday', value: 'monday' },
            { name: 'Tuesday', value: 'tuesday' },
            { name: 'Wednesday', value: 'wednesday' },
            { name: 'Thursday', value: 'thursday' },
            { name: 'Friday', value: 'friday' },
            { name: 'Saturday', value: 'saturday' },
            { name: 'Sunday', value: 'sunday' }
          )
      )
      .addStringOption(opt => opt.setName('time').setDescription('Time range (e.g., "6pm-10pm")').setRequired(true)),

    // Enhanced Voice Channel Management with temporary categories - FIXED ORDER
    new SlashCommandBuilder()
      .setName('voice')
      .setDescription('Voice channel management')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create a temporary voice channel with category')
          // Required options first
          .addStringOption(opt => opt.setName('name').setDescription('Channel name').setRequired(true))
          // Optional options after required ones
          .addIntegerOption(opt => opt.setName('limit').setDescription('User limit').setRequired(false))
          .addStringOption(opt => 
            opt.setName('type')
              .setDescription('Channel type')
              .setRequired(false)
              .addChoices(
                { name: 'Gaming Session', value: 'gaming' },
                { name: 'Strategy Discussion', value: 'strategy' },
                { name: 'Casual Chat', value: 'casual' }
              )
          )
      ),

    // Theme & Customization Commands - FIXED ORDER
    new SlashCommandBuilder()
      .setName('theme')
      .setDescription('Customize bot appearance')
      .addSubcommand(sub =>
        sub.setName('set')
          .setDescription('Set your personal theme')
          .addStringOption(opt => 
            opt.setName('name')
              .setDescription('Theme name')
              .setRequired(true)
              .addChoices(
                { name: 'Default', value: 'default' },
                { name: 'Dark', value: 'dark' },
                { name: 'Gaming', value: 'gaming' },
                { name: 'Cyber', value: 'cyber' }
              )
          )
      )
      .addSubcommand(sub =>
        sub.setName('preview')
          .setDescription('Preview available themes')
      ),

    // Quick Actions & QoL Commands - FIXED ORDER
    new SlashCommandBuilder()
      .setName('quick')
      .setDescription('Quick action commands')
      .addSubcommand(sub =>
        sub.setName('status')
          .setDescription('Set your gaming status')
          // Required options first
          .addStringOption(opt => 
            opt.setName('status')
              .setDescription('Your current status')
              .setRequired(true)
              .addChoices(
                { name: '🟢 Online', value: 'online' },
                { name: '🟡 Away', value: 'away' },
                { name: '🔴 Do Not Disturb', value: 'dnd' },
                { name: '🎮 Gaming', value: 'gaming' },
                { name: '💤 AFK', value: 'afk' }
              )
          )
          // Optional options after required ones
          .addStringOption(opt => opt.setName('message').setDescription('Custom status message').setRequired(false))
      )
      .addSubcommand(sub =>
        sub.setName('preferences')
          .setDescription('Quick preference settings')
          // All optional
          .addBooleanOption(opt => opt.setName('compact_mode').setDescription('Use compact mode').setRequired(false))
          .addBooleanOption(opt => opt.setName('notifications').setDescription('Enable notifications').setRequired(false))
      ),

    // Achievement System - FIXED ORDER
    new SlashCommandBuilder()
      .setName('achievements')
      .setDescription('View and manage achievements')
      .addSubcommand(sub =>
        sub.setName('view')
          .setDescription('View your achievements')
          .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false))
      )
      .addSubcommand(sub =>
        sub.setName('leaderboard')
          .setDescription('Achievement leaderboard')
      ),

    // Poll System - FIXED ORDER
    new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create interactive polls')
      .addSubcommand(sub =>
        sub.setName('create')
          .setDescription('Create a poll')
          // Required options first
          .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
          .addStringOption(opt => opt.setName('options').setDescription('Options (comma separated)').setRequired(true))
          // Optional options after required ones
          .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(false))
      )
      .addSubcommand(sub =>
        sub.setName('quick')
          .setDescription('Quick yes/no poll')
          .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
      )
  ];

  try {
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(commands);
      console.log(`✅ Enhanced commands registered for guild: ${guild.name}`);
    }
  } catch (error) {
    console.error('Error registering enhanced commands:', error);
  }
});

// Enhanced command handler with all new features
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user, guildId, guild } = interaction;

  // Defer reply immediately to avoid timeout
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply().catch(() => {});
  }

  try {
    // Handle LFG commands with channel restrictions
    if (commandName === 'lfg') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'create') {
        // Check if user is in a game category channel
        if (!isInGameCategory(interaction.channel, guildId)) {
          return interaction.editReply({
            content: '❌ LFG posts can only be created in game-specific channels! Please go to a game category channel to create an LFG post.'
          });
        }

        const gameData = getGameFromChannel(interaction.channel, guildId);
        if (!gameData) {
          return interaction.editReply({
            content: '❌ Could not determine the game for this channel. Please try again in a valid game channel.'
          });
        }

        const game = gameData.name;
        const activity = options.getString('activity');
        const slots = options.getInteger('slots');
        const time = options.getString('time') || 'Now';
        const playstyle = options.getString('playstyle') || 'casual';
        const requirements = options.getString('requirements') || 'None';
        const createPrivate = options.getBoolean('private_channels') ?? true;

        const lfgPost = dataManager.createLFGPost(guildId, {
          creatorId: user.id,
          game,
          activity,
          slots,
          time,
          playstyle,
          requirements,
          channelId: interaction.channel.id,
          createPrivateChannels: createPrivate
        });

        const embed = new EmbedBuilder()
          .setTitle(`🔍 Looking for Group - ${game}`)
          .setColor(gameData.config.color || '#00FF00')
          .setAuthor({ 
            name: user.username, 
            iconURL: user.displayAvatarURL() 
          })
          .addFields(
            { name: '🎯 Activity', value: activity, inline: true },
            { name: '👥 Slots Needed', value: `${slots}`, inline: true },
            { name: '🕐 Time', value: time, inline: true },
            { name: '🎮 Playstyle', value: playstyle, inline: true },
            { name: '📋 Requirements', value: requirements },
            { name: '✅ Participants', value: 'None yet', inline: true },
            { name: '🔒 Private Channels', value: createPrivate ? '✅ Enabled' : '❌ Disabled', inline: true }
          )
          .setFooter({ text: `LFG ID: ${lfgPost.id} • React with ✅ to join!` })
          .setTimestamp();

        const message = await interaction.editReply({ 
          embeds: [embed]
        });

        dataManager.updateLFGPost(lfgPost.id, { messageId: message.id });
        
        await message.react('✅');

        // Create private channels after sending message
        if (createPrivate) {
          const channels = await createPrivateLFGChannels(lfgPost, guild);
          if (channels) {
            dataManager.updateLFGPost(lfgPost.id, { privateChannels: channels });
          }
        }

        // Award LFG creator achievement
        const profile = dataManager.getProfile(user.id, guildId);
        if (profile) {
          const userLFGCount = Object.values(dataManager.lfgPosts).filter(post => 
            post.creatorId === user.id && post.guildId === guildId
          ).length;
          
          if (userLFGCount >= 10 && !profile.achievements?.includes('lfg_creator')) {
            awardAchievement(user.id, guildId, 'lfg_creator');
          }
        }
      }

      else if (subcommand === 'list') {
        const gameFilter = options.getString('game');
        let lfgPosts;

        if (gameFilter) {
          lfgPosts = dataManager.getLFGPostsByGame(guildId, gameFilter);
        } else {
          lfgPosts = dataManager.getAllLFGPosts(guildId);
        }

        // Filter out full posts and archived posts, and only show active ones
        lfgPosts = lfgPosts.filter(post => 
          post.status === 'active' && 
          (post.slots <= 0 || post.participants.length < post.slots) // Not full
        );

        if (lfgPosts.length === 0) {
          return interaction.editReply({
            content: `❌ No active, non-full LFG posts found${gameFilter ? ` for ${gameFilter}` : ''}!`
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🔍 Active LFG Posts${gameFilter ? ` - ${gameFilter}` : ''}`)
          .setColor('#00FF00')
          .setDescription(lfgPosts.map(post => {
            // Calculate time since creation for real-time indicator
            const createdAt = new Date(post.createdAt);
            const timeAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60)); // minutes ago
            let timeIndicator = '';
            
            if (timeAgo < 1) timeIndicator = 'Just now';
            else if (timeAgo < 60) timeIndicator = `${timeAgo}m ago`;
            else {
              const hoursAgo = Math.floor(timeAgo / 60);
              timeIndicator = `${hoursAgo}h ago`;
            }
            
            return `**${post.game}** - ${post.activity}\n` +
                   `👥 ${post.participants.length}/${post.slots} • 🎮 ${post.playstyle} • 🕐 ${post.time} • ⏱️ ${timeIndicator}\n` +
                   `ID: ${post.id}\n`;
          }).join('\n'));

        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Handle setup command with role-based category access
    else if (commandName === 'setup') {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.editReply({
          content: '❌ You need administrator permissions to use this command.'
        });
      }

      const gameName = options.getString('game');
      const channelsInput = options.getString('channels');
      const emoji = options.getString('emoji') || '🎮';
      const color = options.getString('color') || '#5865F2';
      const createRole = options.getBoolean('create_role');
      const createVoice = options.getBoolean('create_voice') || false;

      // Validate color
      const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;
      if (!colorRegex.test(color)) {
        return interaction.editReply({
          content: '❌ Invalid color format. Please use hex format (e.g., #FF5733).'
        });
      }

      // Parse channel names
      const channelNames = channelsInput.split(',').map(name => name.trim()).filter(name => name.length > 0);

      if (channelNames.length === 0) {
        return interaction.editReply({
          content: '❌ Please provide at least one channel name.'
        });
      }

      // Update the reply to show progress
      await interaction.editReply({
        content: '🔄 Setting up game category and channels...'
      });

      try {
        const guild = interaction.guild;

        // Create role first if requested
        let gameRole = null;
        if (createRole) {
          gameRole = await guild.roles.create({
            name: gameName,
            color: color,
            reason: `Game role for ${gameName}`
          });
        }

        // Create category with role-based permissions
        const categoryPermissionOverwrites = [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: client.user.id, // Bot
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels]
          }
        ];

        // Add role permission if created
        if (gameRole) {
          categoryPermissionOverwrites.push({
            id: gameRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages]
          });
        }

        // Add admin roles permission
        const adminRoles = guild.roles.cache.filter(role => role.permissions.has(PermissionFlagsBits.Administrator));
        for (const [_, adminRole] of adminRoles) {
          categoryPermissionOverwrites.push({
            id: adminRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels]
          });
        }

        const category = await guild.channels.create({
          name: `${emoji} ${gameName}`,
          type: ChannelType.GuildCategory,
          permissionOverwrites: categoryPermissionOverwrites,
          reason: `Game setup for ${gameName} by ${interaction.user.tag}`
        });

        const createdChannels = [];

        // Create text channels
        for (const channelName of channelNames) {
          const channel = await guild.channels.create({
            name: channelName.toLowerCase().replace(/\s+/g, '-'),
            type: ChannelType.GuildText,
            parent: category.id,
            topic: `Chat for ${gameName} ${channelName}`,
            reason: `Game setup for ${gameName}`
          });
          createdChannels.push(channel);
        }

        // Create voice channel if requested
        let voiceChannel = null;
        if (createVoice) {
          voiceChannel = await guild.channels.create({
            name: `${gameName} Voice`,
            type: ChannelType.GuildVoice,
            parent: category.id,
            reason: `Game setup for ${gameName}`
          });
          createdChannels.push(voiceChannel);
        }

        // Assign role to creator
        if (gameRole) {
          await interaction.member.roles.add(gameRole);
        }

        // Save game configuration
        const gameConfig = {
          emoji: emoji,
          color: color,
          requireRole: true,
          autoRole: gameRole?.id || null,
          welcomeMessage: null,
          announcements: true,
          LFGChannel: createdChannels.find(c => c.name.includes('lfg'))?.id || null
        };

        const game = dataManager.addGame(guild.id, gameName, category.id, createdChannels.map(c => c.id), gameConfig);

        // Create success embed
        const embed = new EmbedBuilder()
          .setTitle('✅ Game Setup Complete!')
          .setDescription(`Successfully set up **${gameName}** category with ${createdChannels.length} channels`)
          .setColor(color)
          .addFields(
            { name: '📁 Category', value: `${category}`, inline: true },
            { name: '🎨 Color', value: color, inline: true },
            { name: '⚙️ Emoji', value: emoji, inline: true }
          );

        if (createdChannels.length > 0) {
          embed.addFields({
            name: '💬 Channels Created',
            value: createdChannels.map(c => `${c}`).join('\n'),
            inline: false
          });
        }

        if (gameRole) {
          embed.addFields({
            name: '🎭 Role Created',
            value: `${gameRole} (assigned to you)`,
            inline: true
          });
        }

        embed.setFooter({ text: `Category is now private and only accessible to ${gameRole ? 'role holders' : 'authorized users'} and admins` });

        await interaction.editReply({
          content: null,
          embeds: [embed]
        });

      } catch (error) {
        console.error('Error in setup command:', error);
        await interaction.editReply({
          content: `❌ Error setting up game: ${error.message}`
        });
      }
    }

    // Handle enhanced profile creation with more options
    else if (commandName === 'profile') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'create') {
        const gamertag = options.getString('gamertag');
        const bio = options.getString('bio') || '';
        const timezone = options.getString('timezone') || 'UTC';
        const pronouns = options.getString('pronouns') || '';
        const playstyle = options.getString('playstyle') || 'casual';
        const primaryGenre = options.getString('primary_genre');
        const communication = options.getString('communication') || 'both';
        
        let profile = dataManager.getProfile(user.id, guildId);
        if (profile) {
          return interaction.editReply({
            content: '❌ You already have a profile! Use `/profile edit` to update it.'
          });
        }

        // Build game preferences
        const gamePreferences = {
          playstyle: playstyle,
          competitiveLevel: playstyle === 'competitive' ? 'high' : 'medium',
          communication: communication,
          availability: 'evenings',
          genres: primaryGenre ? [primaryGenre] : []
        };

        profile = dataManager.createProfile(user.id, guildId, {
          gamertag,
          bio,
          timezone,
          pronouns,
          playstyle,
          gamePreferences
        });
        
        // Award first profile achievement
        awardAchievement(user.id, guildId, 'first_profile');

        const embed = new EmbedBuilder()
          .setTitle('✅ Profile Created!')
          .setDescription(`Welcome, ${gamertag}! Your gaming profile has been created with enhanced details.`)
          .setColor('#00FF00')
          .addFields(
            { name: '🎮 Gamertag', value: gamertag, inline: true },
            { name: '🎯 Playstyle', value: playstyle, inline: true },
            { name: '🌐 Timezone', value: timezone, inline: true },
            { name: '💬 Communication', value: communication === 'both' ? 'Voice & Text' : communication, inline: true },
            { name: '📝 Bio', value: bio || 'Not set', inline: false }
          )
          .setFooter({ text: 'Use /profile game to add specific games or /profile edit to update information' });

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'view') {
        const targetUser = options.getUser('user') || user;
        const profile = dataManager.getProfile(targetUser.id, guildId);

        if (!profile) {
          return interaction.editReply({
            content: `❌ ${targetUser.id === user.id ? 'You don\'t have' : 'This user doesn\'t have'} a profile yet. Use \`/profile create\` to make one.`
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🎮 ${targetUser.username}'s Profile`)
          .setColor('#5865F2')
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: '🎮 Gamertag', value: profile.gamertag || 'Not set', inline: true },
            { name: '📊 Level', value: `${profile.level}`, inline: true },
            { name: '⭐ XP', value: `${profile.xp}`, inline: true },
            { name: '🌐 Timezone', value: profile.timezone || 'Not set', inline: true },
            { name: '🎯 Playstyle', value: profile.playstyle || 'Not set', inline: true },
            { name: '💬 Pronouns', value: profile.pronouns || 'Not set', inline: true },
            { name: '📝 Bio', value: profile.bio || 'No bio set', inline: false }
          );

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'edit') {
        const field = options.getString('field');
        const value = options.getString('value');

        const profile = dataManager.getProfile(user.id, guildId);
        if (!profile) {
          return interaction.editReply({
            content: '❌ You need to create a profile first with `/profile create`.'
          });
        }

        const updates = {};
        if (field === 'gamertag') updates.gamertag = value;
        else if (field === 'bio') updates.bio = value;
        else if (field === 'timezone') updates.timezone = value;
        else if (field === 'pronouns') updates.pronouns = value;
        else if (field === 'playstyle') updates.playstyle = value;
        else if (field === 'favorite_games') updates.favoriteGames = value.split(',').map(g => g.trim());
        else if (field === 'availability') updates.availability = value;
        else if (field === 'socials') updates.socials = value;
        else if (field === 'communication') updates.gamePreferences = { ...profile.gamePreferences, communication: value };
        else if (field === 'competitive_level') updates.gamePreferences = { ...profile.gamePreferences, competitiveLevel: value };
        else if (field === 'genres') updates.gamePreferences = { ...profile.gamePreferences, genres: value.split(',').map(g => g.trim()) };

        dataManager.updateProfile(user.id, guildId, updates);

        const embed = new EmbedBuilder()
          .setTitle('✅ Profile Updated')
          .setDescription(`Your **${field}** has been updated to: ${value}`)
          .setColor('#00FF00')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'game') {
        const gameName = options.getString('name');
        const genre = options.getString('genre');
        const rank = options.getString('rank');
        const role = options.getString('role');
        const hours = options.getInteger('hours');
        const skillLevel = options.getString('skill_level');

        const profile = dataManager.getProfile(user.id, guildId);
        if (!profile) {
          return interaction.editReply({
            content: '❌ You need to create a profile first with `/profile create`.'
          });
        }

        const gameData = {
          genre: genre,
          rank: rank,
          role: role,
          hours: hours,
          skillLevel: skillLevel,
          addedAt: new Date().toISOString()
        };

        dataManager.addGameToProfile(user.id, guildId, gameName, gameData);

        const embed = new EmbedBuilder()
          .setTitle('✅ Game Added to Profile')
          .setDescription(`**${gameName}** has been added to your profile`)
          .setColor('#00FF00')
          .addFields(
            { name: 'Game', value: gameName, inline: true },
            { name: 'Genre', value: genre || 'Not specified', inline: true },
            { name: 'Rank', value: rank || 'Not specified', inline: true },
            { name: 'Main Role', value: role || 'Not specified', inline: true },
            { name: 'Hours Played', value: hours ? `${hours} hours` : 'Not specified', inline: true },
            { name: 'Skill Level', value: skillLevel || 'Not specified', inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Handle availability command
    else if (commandName === 'availability') {
      const day = options.getString('day');
      const time = options.getString('time');

      const profile = dataManager.getProfile(user.id, guildId);
      if (!profile) {
        return interaction.editReply({
          content: '❌ You need to create a profile first with `/profile create`.'
        });
      }

      const availability = profile.availability || {};
      availability[day] = time;

      dataManager.updateProfile(user.id, guildId, { availability });

      const embed = new EmbedBuilder()
        .setTitle('✅ Availability Updated')
        .setDescription(`Set **${day}** availability to: ${time}`)
        .setColor('#00FF00')
        .addFields(
          { name: 'Current Availability', value: Object.entries(availability).map(([d, t]) => `${d}: ${t}`).join('\n') || 'None set' }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // Handle enhanced voice create with temporary categories
    else if (commandName === 'voice') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'create') {
        const name = options.getString('name');
        const limit = options.getInteger('limit');
        const type = options.getString('type') || 'gaming';

        try {
          const guild = interaction.guild;
          
          // Create temporary category
          const category = await guild.channels.create({
            name: `🔊 ${user.username}'s ${type.charAt(0).toUpperCase() + type.slice(1)} Session`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels]
              },
              {
                id: client.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels]
              }
            ],
            reason: `Temporary voice category for ${user.tag}`
          });

          // Create voice channel in the category
          const voiceChannel = await guild.channels.create({
            name: name,
            type: ChannelType.GuildVoice,
            parent: category.id,
            userLimit: limit || 0,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
              },
              {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels]
              }
            ],
            reason: `Temporary voice channel created by ${interaction.user.tag}`
          });

          // Store category for cleanup
          client.tempVoiceCategories.set(category.id, {
            guildId: guild.id,
            createdAt: Date.now(),
            creatorId: user.id
          });

          const embed = new EmbedBuilder()
            .setTitle('✅ Temporary Voice Category Created!')
            .setDescription(`Created a temporary voice setup for your session`)
            .setColor('#00FF00')
            .addFields(
              { name: '📁 Category', value: `${category}`, inline: true },
              { name: '🔊 Voice Channel', value: `${voiceChannel}`, inline: true },
              { name: '👤 User Limit', value: limit ? `${limit} users` : 'No limit', inline: true },
              { name: '⏰ Auto-Delete', value: 'Category will auto-delete after 2 hours', inline: true }
            )
            .setFooter({ text: 'You can invite others by having them join the voice channel' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });

        } catch (error) {
          console.error('Error creating voice channel:', error);
          await interaction.editReply({
            content: `❌ Error creating voice setup: ${error.message}`
          });
        }
      }
    }

    // Handle enhanced game remove with role deletion
    else if (commandName === 'game') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'remove') {
        const gameName = options.getString('name');
        const game = dataManager.getGame(guildId, gameName);
        
        if (!game) {
          return interaction.editReply({
            content: `❌ Game "${gameName}" not found.`
          });
        }

        try {
          const guild = interaction.guild;
          
          // Delete all channels associated with the game
          for (const channelId of game.channels) {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
              await channel.delete().catch(err => {
                console.log(`Could not delete channel ${channel.name}:`, err.message);
              });
            }
          }

          // Delete the category
          const category = guild.channels.cache.get(game.categoryId);
          if (category) {
            await category.delete().catch(err => {
              console.log(`Could not delete category ${category.name}:`, err.message);
            });
          }

          // Delete the role if it exists
          if (game.config.autoRole) {
            const role = guild.roles.cache.get(game.config.autoRole);
            if (role) {
              await role.delete().catch(err => {
                console.log(`Could not delete role ${role.name}:`, err.message);
              });
            }
          }

          // Remove from database
          dataManager.deleteGame(guildId, gameName);

          await interaction.editReply({
            content: `✅ Game "${gameName}" and all associated channels/roles have been completely removed.`
          });

        } catch (error) {
          console.error('Error removing game:', error);
          await interaction.editReply({
            content: `❌ Error removing game: ${error.message}`
          });
        }
      }
      else if (subcommand === 'list') {
        const games = dataManager.getAllGames(guildId);
        
        if (games.length === 0) {
          return interaction.editReply({
            content: '❌ No games have been set up yet. Use `/setup` to create one.'
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('🎮 Configured Games')
          .setColor('#5865F2')
          .setDescription(games.map(game => 
            `**${game.config.emoji} ${game.name}**\n` +
            `Category: <#${game.categoryId}>\n` +
            `Channels: ${game.channels.length}\n` +
            `Color: ${game.config.color}`
          ).join('\n\n'));

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'info') {
        const gameName = options.getString('name');
        const game = dataManager.getGame(guildId, gameName);
        
        if (!game) {
          return interaction.editReply({
            content: `❌ Game "${gameName}" not found. Use \`/game list\` to see available games.`
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🎮 ${game.config.emoji} ${game.name}`)
          .setColor(game.config.color)
          .addFields(
            { name: 'Category', value: `<#${game.categoryId}>`, inline: true },
            { name: 'Channels', value: `${game.channels.length}`, inline: true },
            { name: 'Color', value: game.config.color, inline: true },
            { name: 'Auto Role', value: game.config.autoRole ? `<@&${game.config.autoRole}>` : 'None', inline: true },
            { name: 'Created', value: new Date(game.createdAt).toLocaleDateString(), inline: true }
          );

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'role') {
        const gameName = options.getString('name');
        const role = options.getRole('role');
        const game = dataManager.getGame(guildId, gameName);
        
        if (!game) {
          return interaction.editReply({
            content: `❌ Game "${gameName}" not found.`
          });
        }

        // Update game with role
        dataManager.updateGame(guildId, gameName, {
          config: { ...game.config, autoRole: role.id }
        });

        await interaction.editReply({
          content: `✅ Role ${role} has been assigned to game **${gameName}**.`
        });
      }
    }

    // Handle settings command
    else if (commandName === 'settings') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'welcome') {
        const channel = options.getChannel('channel');
        
        if (channel.type !== ChannelType.GuildText) {
          return interaction.editReply({
            content: '❌ Please select a text channel.'
          });
        }

        dataManager.updateSettings(guildId, { welcomeChannel: channel.id });

        const embed = new EmbedBuilder()
          .setTitle('✅ Welcome Channel Set')
          .setDescription(`Welcome messages will now be sent to ${channel}`)
          .setColor('#00FF00')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'logs') {
        const channel = options.getChannel('channel');
        
        if (channel.type !== ChannelType.GuildText) {
          return interaction.editReply({
            content: '❌ Please select a text channel.'
          });
        }

        dataManager.updateSettings(guildId, { logChannel: channel.id });

        const embed = new EmbedBuilder()
          .setTitle('✅ Log Channel Set')
          .setDescription(`Bot logs will now be sent to ${channel}`)
          .setColor('#00FF00')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'color') {
        const hex = options.getString('hex');
        const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;

        if (!colorRegex.test(hex)) {
          return interaction.editReply({
            content: '❌ Invalid color format. Please use hex format (e.g., #FF5733).'
          });
        }

        dataManager.updateSettings(guildId, { embedColor: hex });

        const embed = new EmbedBuilder()
          .setTitle('✅ Embed Color Updated')
          .setDescription(`Default embed color set to ${hex}`)
          .setColor(hex)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'view') {
        const settings = dataManager.getSettings(guildId);

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Server Settings')
          .setColor(settings.embedColor)
          .addFields(
            { name: 'Welcome Channel', value: settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : 'Not set', inline: true },
            { name: 'Log Channel', value: settings.logChannel ? `<#${settings.logChannel}>` : 'Not set', inline: true },
            { name: 'Embed Color', value: settings.embedColor, inline: true },
            { name: 'Prefix', value: settings.prefix, inline: true },
            { name: 'Timezone', value: settings.timezone, inline: true },
            { name: 'Language', value: settings.language, inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Handle stats commands
    else if (commandName === 'stats') {
      const subcommand = options.getSubcommand();
      
      if (subcommand === 'view') {
        const targetUser = options.getUser('user') || user;
        const profile = dataManager.getProfile(targetUser.id, guildId);
        
        if (!profile) {
          return interaction.editReply({ 
            content: `❌ ${targetUser.id === user.id ? 'You don\\'t have' : 'This user doesn\\'t have'} a profile yet. Use \\`/profile create\\` to make one.` 
          });
        }
        
        const embed = new EmbedBuilder()
          .setTitle(`📊 ${targetUser.username}'s Stats`)
          .setColor('#5865F2')
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: '🏆 Level', value: `${profile.level}`, inline: true },
            { name: '⭐ XP', value: `${profile.xp}`, inline: true },
            { name: '🎮 Games Played', value: `${profile.stats?.gamesPlayed || 0}`, inline: true },
            { name: '⏱️ Hours Played', value: `${profile.stats?.hoursPlayed || 0}`, inline: true },
            { name: '✅ Matches Won', value: `${profile.stats?.matchesWon || 0}`, inline: true },
            { name: '❌ Matches Lost', value: `${profile.stats?.matchesLost || 0}`, inline: true },
            { name: '📈 Win Rate', value: profile.stats?.matchesPlayed > 0 ? 
              `${Math.round((profile.stats.matchesWon / profile.stats.matchesPlayed) * 100)}%` : 
              '0%', inline: true },
            { name: '🔥 Current Win Streak', value: `${profile.stats?.winStreak || 0}`, inline: true },
            { name: '🏆 Best Win Streak', value: `${profile.stats?.bestWinStreak || 0}`, inline: true },
            { name: '🥇 Rank', value: profile.stats?.rank || 'Unranked', inline: true },
            { name: '🎯 Favorite Role', value: profile.stats?.favoriteRole || 'Flex', inline: true },
            { name: '🏆 Achievements', value: `${profile.achievements?.length || 0} earned`, inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
      
      else if (subcommand === 'log') {
        const gameName = options.getString('game');
        const result = options.getString('result');
        const duration = options.getInteger('duration') || 0;
        const role = options.getString('role');
        
        const profile = dataManager.getProfile(user.id, guildId);
        if (!profile) {
          return interaction.editReply({ 
            content: '❌ You need to create a profile first with `/profile create`.' 
          });
        }
        
        // Update stats based on result
        const updates = { stats: { ...profile.stats } };
        updates.stats.gamesPlayed = (updates.stats.gamesPlayed || 0) + 1;
        updates.stats.hoursPlayed = (updates.stats.hoursPlayed || 0) + (duration / 60);
        
        if (result === 'win') {
          updates.stats.matchesWon = (updates.stats.matchesWon || 0) + 1;
          updates.stats.winStreak = (updates.stats.winStreak || 0) + 1;
          if (updates.stats.winStreak > (updates.stats.bestWinStreak || 0)) {
            updates.stats.bestWinStreak = updates.stats.winStreak;
          }
        } else if (result === 'loss') {
          updates.stats.matchesLost = (updates.stats.matchesLost || 0) + 1;
          updates.stats.winStreak = 0;
        }
        
        updates.stats.matchesPlayed = (updates.stats.gamesPlayed || 0);
        
        if (role) updates.stats.favoriteRole = role;
        
        dataManager.updateProfile(user.id, guildId, updates);
        
        const embed = new EmbedBuilder()
          .setTitle('📊 Match Logged')
          .setDescription(`Successfully logged a **${result.toUpperCase()}** for **${gameName}**`)
          .setColor(result === 'win' ? '#57F287' : '#ED4245')
          .addFields(
            { name: 'Duration', value: duration > 0 ? `${duration} minutes` : 'Not specified', inline: true },
            { name: 'Role', value: role || 'Not specified', inline: true },
            { name: 'New Win Streak', value: `${updates.stats.winStreak}`, inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
      
      else if (subcommand === 'leaderboard') {
        const gameFilter = options.getString('game');
        const metric = options.getString('metric') || 'level';
        
        // Get all profiles and sort by the specified metric
        const allProfiles = Object.values(dataManager.profiles)
          .filter(profile => profile.guildId === guildId)
          .sort((a, b) => {
            if (metric === 'level') return b.level - a.level;
            if (metric === 'wins') return (b.stats?.matchesWon || 0) - (a.stats?.matchesWon || 0);
            if (metric === 'win_rate') {
              const bRate = b.stats?.matchesPlayed > 0 ? (b.stats.matchesWon / b.stats.matchesPlayed) : 0;
              const aRate = a.stats?.matchesPlayed > 0 ? (a.stats.matchesWon / a.stats.matchesPlayed) : 0;
              return bRate - aRate;
            }
            if (metric === 'games_played') return (b.stats?.gamesPlayed || 0) - (a.stats?.gamesPlayed || 0);
            return b.level - a.level; // Default to level
          })
          .slice(0, 10); // Top 10
        
        if (allProfiles.length === 0) {
          return interaction.editReply({ 
            content: '❌ No profiles found to create a leaderboard.' 
          });
        }
        
        const leaderboardText = allProfiles.map((profile, index) => {
          const user = guild.members.cache.get(profile.userId);
          const displayName = user ? user.user.username : 'Unknown User';
          let value = '';
          
          if (metric === 'level') value = `Level ${profile.level}`;
          else if (metric === 'wins') value = `${profile.stats?.matchesWon || 0} wins`;
          else if (metric === 'win_rate') {
            const rate = profile.stats?.matchesPlayed > 0 ? 
              Math.round((profile.stats.matchesWon / profile.stats.matchesPlayed) * 100) : 0;
            value = `${rate}% win rate`;
          }
          else if (metric === 'games_played') value = `${profile.stats?.gamesPlayed || 0} games`;
          
          return `${index + 1}. **${displayName}** - ${value}`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
          .setTitle(`🏆 ${metric.replace('_', ' ').toUpperCase()} Leaderboard`)
          .setDescription(leaderboardText)
          .setColor('#FFD700')
          .setFooter({ text: `Top ${allProfiles.length} ${metric.replace('_', ' ')} earners` })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Handle theme commands
    else if (commandName === 'theme') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'set') {
        const themeName = options.getString('name');
        const profile = dataManager.getProfile(user.id, guildId);

        if (!profile) {
          return interaction.editReply({ 
            content: '❌ Create a profile first with `/profile create`'
          });
        }

        dataManager.updateProfile(user.id, guildId, {
          preferences: { ...profile.preferences, theme: themeName }
        });

        const theme = getTheme(guildId, themeName);
        const embed = new EmbedBuilder()
          .setTitle('🎨 Theme Applied!')
          .setDescription(`Your personal theme has been set to **${theme.name}**`)
          .setColor(theme.colors.primary)
          .addFields(
            { name: 'Primary Color', value: theme.colors.primary, inline: true },
            { name: 'Background', value: theme.colors.background, inline: true },
            { name: 'Text Color', value: theme.colors.text, inline: true }
          )
          .setFooter({ text: 'This theme will be used for all your personal embeds' });

        await interaction.editReply({ embeds: [embed] });
      }

      else if (subcommand === 'preview') {
        const embed = new EmbedBuilder()
          .setTitle('🎨 Available Themes')
          .setDescription('Preview of all available themes:')
          .setColor('#5865F2');

        Object.entries(DEFAULT_THEMES).forEach(([key, theme]) => {
          embed.addFields({
            name: `${theme.name} Theme`,
            value: `Primary: ${theme.colors.primary}\nSuccess: ${theme.colors.success}\nUse: \`/theme set ${key}\``,
            inline: true
          });
        });

        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Handle quick actions
    else if (commandName === 'quick') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'status') {
        const status = options.getString('status');
        const message = options.getString('message') || '';

        const statusEmojis = {
          online: '🟢',
          away: '🟡',
          dnd: '🔴',
          gaming: '🎮',
          afk: '💤'
        };

        const statusNames = {
          online: 'Online',
          away: 'Away',
          dnd: 'Do Not Disturb',
          gaming: 'Gaming',
          afk: 'AFK'
        };

        const embed = new EmbedBuilder()
          .setTitle(`${statusEmojis[status]} Status Updated`)
          .setDescription(`**${user.username}** is now **${statusNames[status]}**`)
          .setColor('#5865F2')
          .setTimestamp();

        if (message) {
          embed.addFields({ name: 'Message', value: message });
        }

        await interaction.editReply({ embeds: [embed] });
      }

      else if (subcommand === 'preferences') {
        const compactMode = options.getBoolean('compact_mode');
        const notifications = options.getBoolean('notifications');
        const profile = dataManager.getProfile(user.id, guildId);

        if (!profile) {
          return interaction.editReply({ 
            content: '❌ Create a profile first with `/profile create`'
          });
        }

        const updates = { preferences: { ...profile.preferences } };
        if (compactMode !== null) updates.preferences.compactMode = compactMode;
        if (notifications !== null) updates.preferences.notifications = notifications;

        dataManager.updateProfile(user.id, guildId, updates);

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Preferences Updated')
          .setColor('#00FF00')
          .addFields(
            { name: 'Compact Mode', value: compactMode !== null ? (compactMode ? '✅ Enabled' : '❌ Disabled') : 'No change', inline: true },
            { name: 'Notifications', value: notifications !== null ? (notifications ? '✅ Enabled' : '❌ Disabled') : 'No change', inline: true }
          );

        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Handle achievements
    else if (commandName === 'achievements') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'view') {
        const targetUser = options.getUser('user') || user;
        const profile = dataManager.getProfile(targetUser.id, guildId);

        if (!profile) {
          return interaction.editReply({ 
            content: `❌ ${targetUser.id === user.id ? 'You don\'t' : 'This user doesn\'t'} have a profile yet.`
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🏆 ${targetUser.username}'s Achievements`)
          .setColor('#FFD700')
          .setThumbnail(targetUser.displayAvatarURL());

        if (profile.achievements && profile.achievements.length > 0) {
          const achievementText = profile.achievements.map(achId => {
            const achievement = ACHIEVEMENTS[achId];
            return `${achievement.icon} **${achievement.name}**\n${achievement.description}`;
          }).join('\n\n');

          embed.setDescription(achievementText);
        } else {
          embed.setDescription('No achievements yet! Keep using the bot to earn achievements.');
        }

        embed.addFields(
          { name: 'Total Achievements', value: `${profile.achievements?.length || 0}/${Object.keys(ACHIEVEMENTS).length}`, inline: true },
          { name: 'Level', value: `${profile.level}`, inline: true },
          { name: 'XP', value: `${profile.xp}`, inline: true }
        );

        await interaction.editReply({ embeds: [embed] });
      }

      else if (subcommand === 'leaderboard') {
        const allProfiles = Object.values(dataManager.profiles)
          .filter(p => p.guildId === guildId)
          .sort((a, b) => (b.achievements?.length || 0) - (a.achievements?.length || 0))
          .slice(0, 10);

        if (allProfiles.length === 0) {
          return interaction.editReply({
            content: '❌ No achievements recorded yet!'
          });
        }

        const leaderboardText = allProfiles.map((p, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          return `${medal} <@${p.userId}> - **${p.achievements?.length || 0}** achievements`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setTitle('🏆 Achievement Leaderboard')
          .setColor('#FFD700')
          .setDescription(leaderboardText)
          .setFooter({ text: `Top ${allProfiles.length} achievers` });

        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Handle polls
    else if (commandName === 'poll') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'create') {
        const question = options.getString('question');
        const optionsInput = options.getString('options');
        const duration = options.getInteger('duration') || 60;

        const optionsList = optionsInput.split(',').map(opt => opt.trim());
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const embed = new EmbedBuilder()
          .setTitle('📊 Poll: ' + question)
          .setColor('#5865F2')
          .setFooter({ text: `Poll ends in ${duration} minutes • Created by ${user.username}` })
          .setTimestamp();

        optionsList.forEach((option, index) => {
          if (index < 10) {
            embed.addFields({
              name: `${emojis[index]} ${option}`,
              value: `0 votes`,
              inline: true
            });
          }
        });

        const message = await interaction.editReply({ 
          embeds: [embed]
        });

        // Add reactions
        for (let i = 0; i < Math.min(optionsList.length, 10); i++) {
          await message.react(emojis[i]);
        }

        // Set timeout to end poll
        setTimeout(async () => {
          const endedEmbed = EmbedBuilder.from(embed)
            .setTitle('📊 Poll Ended: ' + question)
            .setColor('#FF0000')
            .setFooter({ text: `Poll ended • Created by ${user.username}` });

          await message.edit({ embeds: [endedEmbed] });
        }, duration * 60 * 1000);
      }

      else if (subcommand === 'quick') {
        const question = options.getString('question');

        const embed = new EmbedBuilder()
          .setTitle('📊 Quick Poll: ' + question)
          .setColor('#5865F2')
          .setFooter({ text: `React with ✅ or ❌ • Created by ${user.username}` })
          .setTimestamp();

        const message = await interaction.editReply({ 
          embeds: [embed]
        });

        await message.react('✅');
        await message.react('❌');
      }
    }

  } catch (error) {
    console.error('Command error:', error);
    
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ 
          content: '❌ An error occurred while executing this command.' 
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred while executing this command.',
          flags: 64
        });
      }
    } catch (replyError) {
      console.error('Could not send error message:', replyError);
    }
  }
});

// Reaction handler for LFG posts
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  const { message, emoji } = reaction;
  const lfgPosts = dataManager.lfgPosts;
  
  const lfgPost = Object.values(lfgPosts).find(
    post => post.messageId === message.id && post.status === 'active'
  );

  if (!lfgPost) return;

  try {
    if (emoji.name === '✅') {
      await handleJoinReaction(lfgPost, user, message);
    }

    await reaction.users.remove(user.id).catch(() => {});
  } catch (error) {
    console.error('Error handling LFG reaction:', error);
  }
});

// Enhanced achievement awarding system with game-specific achievements
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const profile = dataManager.getProfile(message.author.id, message.guild.id);
  if (!profile) return;

  // Track game-specific LFG participation for achievements
  if (!profile.achievements?.includes('social_butterfly')) {
    const userLFGCount = Object.values(dataManager.lfgPosts).filter(post => 
      post.participants.includes(message.author.id)
    ).length;

    if (userLFGCount >= 20) {
      awardAchievement(message.author.id, message.guild.id, 'social_butterfly');
    }
  }

  // Game-specific achievements
  const userLFGs = Object.values(dataManager.lfgPosts).filter(post => 
    post.participants.includes(message.author.id)
  );

  const mmoCount = userLFGs.filter(post => {
    const game = post.game.toLowerCase();
    return game.includes('wow') || game.includes('final fantasy') || game.includes('eso') || 
           game.includes('guild wars') || game.includes('mmo') || game.includes('rpg');
  }).length;

  const mobaCount = userLFGs.filter(post => {
    const game = post.game.toLowerCase();
    return game.includes('league') || game.includes('dota') || game.includes('smite') || 
           game.includes('moba') || game.includes('heroes');
  }).length;

  const fpsCount = userLFGs.filter(post => {
    const game = post.game.toLowerCase();
    return game.includes('valorant') || game.includes('counter') || game.includes('overwatch') || 
           game.includes('apex') || game.includes('call of duty') || game.includes('fps');
  }).length;

  if (mmoCount >= 25 && !profile.achievements?.includes('mmo_expert')) {
    awardAchievement(message.author.id, message.guild.id, 'mmo_expert');
  }

  if (mobaCount >= 25 && !profile.achievements?.includes('moba_pro')) {
    awardAchievement(message.author.id, message.guild.id, 'moba_pro');
  }

  if (fpsCount >= 25 && !profile.achievements?.includes('fps_champion')) {
    awardAchievement(message.author.id, message.guild.id, 'fps_champion');
  }
});

// Welcome new members with enhanced message including manual and rules
client.on('guildMemberAdd', async member => {
  const settings = dataManager.getSettings(member.guild.id);
  
  if (settings.welcomeChannel) {
    const channel = member.guild.channels.cache.get(settings.welcomeChannel);
    
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle('👋 Welcome to the Gaming Community!')
        .setDescription(`Welcome ${member}! We're excited to have you in our gaming community!`)
        .setColor(settings.embedColor)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          {
            name: '📖 Quick Start Guide',
            value: '• Use `/profile create` to set up your detailed gaming profile\n• Browse games with `/game list`\n• Find players in game channels with `/lfg create`\n• Check your stats with `/stats view`\n• Set availability with `/availability`'
          },
          {
            name: '🎮 Game Categories',
            value: '• **MMO/RPG**: WoW, FFXIV, ESO, Guild Wars 2\n• **MOBA**: League, Dota 2, Smite\n• **FPS**: Valorant, CS:GO, Overwatch, Apex\n• Setup your favorite games with `/setup`'
          },
          {
            name: '📜 Server Rules',
            value: '• Be respectful to all members\n• No harassment or hate speech\n• Keep game discussions in appropriate channels\n• Use LFG system properly in game channels\n• No spamming or excessive self-promotion\n• Follow Discord Terms of Service'
          }
        )
        .setFooter({ text: 'Enjoy your stay and happy gaming! 🎮' })
        .setTimestamp();

      try {
        await channel.send({ 
          content: `🎉 Welcome ${member}! Please read the information below to get started:`,
          embeds: [embed] 
        });
        
        // Also send a DM with the welcome message
        try {
          const dmEmbed = EmbedBuilder.from(embed).setTitle('👋 Welcome to ' + member.guild.name);
          await member.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`Could not send DM to ${member.user.tag}`);
        }
      } catch (error) {
        console.error('Error sending welcome message:', error);
      }
    }
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN not found in environment variables!');
  process.exit(1);
}

client.login(token);