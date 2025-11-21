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
client.userLFGCreation = new Collection();
client.userTempChannels = new Collection();

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LFG_FILE = path.join(DATA_DIR, 'lfg.json');
const THEMES_FILE = path.join(DATA_DIR, 'themes.json');
const CUSTOM_COMMANDS_FILE = path.join(DATA_DIR, 'custom_commands.json');
const GAME_CONFIGS_FILE = path.join(DATA_DIR, 'game_configs.json');

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
    this.gameConfigs = this.loadData(GAME_CONFIGS_FILE, {});
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
      games: data.games || {},
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
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.saveData(PROFILES_FILE, this.profiles);
      return true;
    }
    return false;
  }

  updateGameInProfile(userId, guildId, gameName, updates) {
    const profile = this.getProfile(userId, guildId);
    if (profile && profile.games && profile.games[gameName]) {
      profile.games[gameName] = {
        ...profile.games[gameName],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveData(PROFILES_FILE, this.profiles);
      return true;
    }
    return false;
  }

  // Game config methods
  getGameConfig(guildId, gameName) {
    return this.gameConfigs[`${guildId}-${gameName.toLowerCase()}`] || null;
  }

  getAllGameConfigs(guildId) {
    return Object.values(this.gameConfigs).filter(config => config.guildId === guildId);
  }

  createGameConfig(guildId, gameName, configData) {
    const key = `${guildId}-${gameName.toLowerCase()}`;
    this.gameConfigs[key] = {
      guildId,
      gameName,
      roles: configData.roles || [],
      ranks: configData.ranks || [],
      customFields: configData.customFields || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveData(GAME_CONFIGS_FILE, this.gameConfigs);
    return this.gameConfigs[key];
  }

  updateGameConfig(guildId, gameName, updates) {
    const key = `${guildId}-${gameName.toLowerCase()}`;
    if (this.gameConfigs[key]) {
      this.gameConfigs[key] = {
        ...this.gameConfigs[key],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveData(GAME_CONFIGS_FILE, this.gameConfigs);
      return this.gameConfigs[key];
    }
    return null;
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
    return Object.values(this.lfgPosts).filter(post => 
      post.guildId === guildId && 
      post.status === 'active' &&
      post.participants.length < post.slots
    );
  }

  getLFGPostsByGame(guildId, gameName) {
    return Object.values(this.lfgPosts).filter(post => 
      post.guildId === guildId && 
      post.status === 'active' && 
      post.participants.length < post.slots &&
      post.game.toLowerCase() === gameName.toLowerCase()
    );
  }

  getUserActiveLFGPosts(guildId, userId) {
    return Object.values(this.lfgPosts).filter(post => 
      post.guildId === guildId && 
      post.status === 'active' && 
      post.creatorId === userId
    );
  }
}

const dataManager = new DataManager();

// Timezone options
const TIMEZONES = [
  'UTC', 'GMT', 'EST', 'PST', 'CST', 'MST', 'AST', 'HST', 'AKST',
  'CET', 'EET', 'WET', 'IST', 'JST', 'KST', 'CST', 'AEST', 'ACST',
  'AWST', 'NZST', 'BST', 'IST', 'WIB', 'WITA', 'WIT', 'PKT', 'BDT',
  'NPT', 'MMT', 'ALMT', 'YEKT', 'OMST', 'KRAT', 'IRKT', 'YAKT', 'VLAT',
  'MAGT', 'PETT', 'ANAT', 'SRET', 'SAKT', 'CHOST', 'CHOT', 'HOVT',
  'ULAT', 'AWST', 'ACWST', 'CXT', 'DAVT', 'DDUT', 'MAWT', 'NZDT',
  'ROTT', 'SYOT', 'VOST', 'AZOT', 'CVT', 'EGT', 'BRT', 'FNT', 'GFT',
  'NST', 'ART', 'CLT', 'PYT', 'BOT', 'VET', 'GYT', 'EST', 'COT', 'PET',
  'ECT', 'ACT', 'CST', 'EAST', 'GALT', 'MART', 'SST', 'BIT', 'CHAST',
  'KOST', 'MIST', 'NFT', 'PONT', 'SAKT', 'SBT', 'VUT', 'FJT', 'GILT',
  'MHT', 'NRT', 'NZST', 'PHOT', 'TKT', 'TOT', 'WAKT', 'CHADT', 'WST',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 
  'America/Anchorage', 'Pacific/Honolulu', 'America/Phoenix', 'America/Indiana/Indianapolis',
  'America/Kentucky/Louisville', 'America/Detroit', 'America/Boise', 'America/Juneau',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Vienna', 'Europe/Brussels',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Jerusalem',
  'Asia/Seoul', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Bangkok', 'Asia/Karachi',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide',
  'Pacific/Auckland', 'Pacific/Fiji', 'America/Sao_Paulo', 'America/Mexico_City',
  'America/Toronto', 'America/Vancouver', 'America/Montreal', 'America/Argentina/Buenos_Aires'
];

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

// Enhanced Achievement System with Custom Images
const ACHIEVEMENTS = {
  first_profile: {
    name: 'First Steps',
    description: 'Create your first profile',
    icon: '🌱',
    image: 'https://example.com/achievements/first_steps.png',
    xp: 50
  },
  lfg_creator: {
    name: 'Matchmaker',
    description: 'Create 10 LFG posts',
    icon: '🎯',
    image: 'https://example.com/achievements/matchmaker.png',
    xp: 100
  },
  social_butterfly: {
    name: 'Social Butterfly',
    description: 'Join 20 different LFG groups',
    icon: '🦋',
    image: 'https://example.com/achievements/social_butterfly.png',
    xp: 150
  },
  veteran: {
    name: 'Veteran Gamer',
    description: 'Reach level 20',
    icon: '🎖️',
    image: 'https://example.com/achievements/veteran.png',
    xp: 200
  },
  winner: {
    name: 'Born to Win',
    description: 'Win 50 matches',
    icon: '🏆',
    image: 'https://example.com/achievements/winner.png',
    xp: 250
  },
  mmo_expert: {
    name: 'MMO Legend',
    description: 'Participate in 25 MMO LFG groups',
    icon: '⚔️',
    image: 'https://example.com/achievements/mmo_legend.png',
    xp: 175
  },
  moba_pro: {
    name: 'MOBA Master',
    description: 'Participate in 25 MOBA LFG groups',
    icon: '🎯',
    image: 'https://example.com/achievements/moba_master.png',
    xp: 175
  },
  fps_champion: {
    name: 'FPS Champion',
    description: 'Participate in 25 FPS LFG groups',
    icon: '🔫',
    image: 'https://example.com/achievements/fps_champion.png',
    xp: 175
  },
  dedicated_player: {
    name: 'Dedicated Player',
    description: 'Play for 100 hours total',
    icon: '⏰',
    image: 'https://example.com/achievements/dedicated.png',
    xp: 300
  },
  team_player: {
    name: 'Team Player',
    description: 'Complete 50 group activities',
    icon: '👥',
    image: 'https://example.com/achievements/team_player.png',
    xp: 200
  },
  early_bird: {
    name: 'Early Bird',
    description: 'Join 10 morning sessions',
    icon: '🌅',
    image: 'https://example.com/achievements/early_bird.png',
    xp: 150
  },
  night_owl: {
    name: 'Night Owl',
    description: 'Join 10 late night sessions',
    icon: '🌙',
    image: 'https://example.com/achievements/night_owl.png',
    xp: 150
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

// Check if user can create temporary channel
function canCreateTempChannel(userId) {
  const now = Date.now();
  const userData = client.userTempChannels.get(userId) || { count: 0, lastReset: now };
  
  if (now - userData.lastReset > 24 * 60 * 60 * 1000) {
    userData.count = 0;
    userData.lastReset = now;
  }
  
  if (userData.count >= 2) {
    return false;
  }
  
  userData.count++;
  client.userTempChannels.set(userId, userData);
  return true;
}

// Check if user can create LFG post
function canCreateLFG(userId, guildId) {
  const activeLFGs = dataManager.getUserActiveLFGPosts(guildId, userId);
  return activeLFGs.length === 0;
}

// Enhanced LFG system with inactivity tracking
async function checkLFGInactivity() {
  const now = new Date();
  const lfgPosts = dataManager.lfgPosts;

  Object.values(lfgPosts).forEach(async (post) => {
    if (post.status !== 'active' || !post.privateChannels) return;

    const lastActivity = new Date(post.lastActivity);
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
    
    if (minutesSinceActivity >= 10) {
      await expireLFGPost(post, 'Inactive for 10 minutes');
      
      try {
        const creator = await client.users.fetch(post.creatorId);
        if (creator) {
          await creator.send({
            content: `⏰ Your LFG post for **${post.game}** was automatically removed due to inactivity (no activity in private channels for 10 minutes).`
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error notifying creator:', error);
      }
    }
  });
}

// Update last activity for LFG
function updateLFGActivity(lfgId) {
  const post = dataManager.getLFGPost(lfgId);
  if (post) {
    dataManager.updateLFGPost(lfgId, { lastActivity: new Date().toISOString() });
  }
}

// Enhanced LFG reaction handling
async function handleJoinReaction(lfgPost, user, message) {
  if (user.id === lfgPost.creatorId) {
    const dmChannel = await user.createDM();
    await dmChannel.send({
      content: "❌ You can't join your own LFG post!"
    }).catch(() => {});
    return;
  }

  const isParticipant = lfgPost.participants.includes(user.id);
  
  if (isParticipant) {
    return;
  }

  const currentParticipants = lfgPost.participants.length;
  if (lfgPost.slots > 0 && currentParticipants >= lfgPost.slots) {
    const dmChannel = await user.createDM();
    await dmChannel.send({
      content: "❌ This LFG post is already full!"
    }).catch(() => {});
    return;
  }

  const participants = [...lfgPost.participants, user.id];
  
  dataManager.updateLFGPost(lfgPost.id, { 
    participants,
    lastActivity: new Date().toISOString()
  });

  let channels = lfgPost.privateChannels;
  if (!channels && lfgPost.createPrivateChannels !== false) {
    const guild = client.guilds.cache.get(lfgPost.guildId);
    channels = await createPrivateLFGChannels(lfgPost, guild);
  }

  if (channels) {
    await addUserToPrivateChannels(lfgPost.guildId, channels, user.id);
  }

  const creator = await client.users.fetch(lfgPost.creatorId).catch(() => null);
  const joiningUser = user;

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

  if (creator) {
    await creator.send({
      content: `✅ **${joiningUser?.username || 'Unknown'}** joined your LFG for **${lfgPost.game}**!` +
               (channels ? `\nThey've been added to your private channels.` : '')
    }).catch(() => {});
  }

  await updateLFGEmbed(lfgPost);

  const channel = client.channels.cache.get(lfgPost.channelId);
  if (channel) {
    await channel.send({
      content: `🎮 **${joiningUser?.username || 'Unknown'}** joined the LFG for **${lfgPost.game}**! (${participants.length}/${lfgPost.slots} players)`
    }).catch(() => {});
  }

  if (channels && lfgPost.slots > 0 && participants.length >= lfgPost.slots) {
    await autoCallToVoice(lfgPost, channels);
  }
}

// Create private LFG channels
async function createPrivateLFGChannels(lfgPost, guild) {
  try {
    const category = await guild.channels.create({
      name: `🔒 LFG-${lfgPost.game}-${lfgPost.id.slice(-6)}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: lfgPost.creatorId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages]
        }
      ],
      reason: `Private channels for LFG: ${lfgPost.game}`
    });

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

    dataManager.updateLFGPost(lfgPost.id, { privateChannels: channels });

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

// Add user to private channels
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

    if (textChannel) {
      await textChannel.send({
        content: `👋 <@${userId}> has joined the group! Welcome! 🎉`
      }).catch(() => {});
    }

  } catch (error) {
    console.error('Error adding user to private channels:', error);
  }
}

// Auto-call to voice
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

    await textChannel.send({
      content: mentionString,
      embeds: [callEmbed]
    }).catch(() => {});

  } catch (error) {
    console.error('Error in auto-call:', error);
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

// Expire LFG post
async function expireLFGPost(post, reason) {
  dataManager.updateLFGPost(post.id, { 
    status: 'expired',
    expiredAt: new Date().toISOString(),
    expireReason: reason
  });

  if (post.privateChannels) {
    await deletePrivateChannels(post.guildId, post.privateChannels);
  }

  try {
    const channel = client.channels.cache.get(post.channelId);
    if (channel) {
      const message = await channel.messages.fetch(post.messageId).catch(() => null);
      
      if (message) {
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
          components: []
        });

        await channel.send({
          content: `⏰ LFG post for **${post.game}** has expired and been archived.`,
          allowedMentions: { parse: [] }
        }).catch(() => {});
      } else {
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

// Cleanup old LFG posts
function cleanupOldLFGPosts() {
  const now = new Date();
  const lfgPosts = dataManager.lfgPosts;

  Object.values(lfgPosts).forEach(async (post) => {
    if (post.status !== 'active') return;

    const postDate = new Date(post.createdAt);
    const hoursSinceCreation = (now - postDate) / (1000 * 60 * 60);
    
    if (hoursSinceCreation >= 24) {
      await expireLFGPost(post, '24-hour time limit reached');
    }
  });
}

// Cleanup temporary voice categories
function cleanupTempVoiceCategories() {
  const now = Date.now();
  client.tempVoiceCategories.forEach((data, categoryId) => {
    if (now - data.createdAt > 2 * 60 * 60 * 1000) {
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

// Award achievement
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

  try {
    const user = client.users.cache.get(userId);
    if (user) {
      const embed = new EmbedBuilder()
        .setTitle('🏆 Achievement Unlocked!')
        .setDescription(`**${achievement.name}**\n${achievement.description}`)
        .setColor('#FFD700')
        .setThumbnail(achievement.image)
        .addFields(
          { name: 'Reward', value: `${achievement.xp} XP`, inline: true },
          { name: 'Icon', value: achievement.icon, inline: true }
        )
        .setTimestamp();

      user.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (error) {
    console.error('Error sending achievement notification:', error);
  }

  return achievement;
}

// Enhanced setup command
const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Setup a new game category with channels and game configuration')
  .addStringOption(opt => opt.setName('game').setDescription('Game name').setRequired(true))
  .addStringOption(opt => 
    opt.setName('channels')
      .setDescription('Channel names (comma-separated, e.g., general,lfg,strategies)')
      .setRequired(true)
  )
  .addBooleanOption(opt => opt.setName('create_role').setDescription('Create a role for this game').setRequired(true))
  .addStringOption(opt => 
    opt.setName('roles')
      .setDescription('Custom roles for this game (comma-separated, e.g., Tank,Healer,DPS)')
      .setRequired(false)
  )
  .addStringOption(opt => 
    opt.setName('ranks')
      .setDescription('Custom ranks for this game (comma-separated, e.g., Bronze,Silver,Gold,Platinum,Diamond)')
      .setRequired(false)
  )
  .addStringOption(opt => opt.setName('emoji').setDescription('Category emoji (e.g., 🎮)').setRequired(false))
  .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g., #FF5733)').setRequired(false))
  .addBooleanOption(opt => opt.setName('create_voice').setDescription('Create voice channels too').setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Enhanced profile command
const profileCommand = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Manage your gaming profile')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create your gaming profile')
      .addStringOption(opt => opt.setName('gamertag').setDescription('Your main gamertag/username').setRequired(true))
      .addStringOption(opt => opt.setName('bio').setDescription('A short bio about yourself').setRequired(false))
      .addStringOption(opt => 
        opt.setName('timezone')
          .setDescription('Your timezone')
          .setRequired(false)
          .addChoices(...TIMEZONES.map(tz => ({ name: tz, value: tz })))
      )
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
      .addStringOption(opt => opt.setName('games').setDescription('Your favorite games (comma-separated)').setRequired(false))
      .addStringOption(opt => opt.setName('role').setDescription('Your main role in games').setRequired(false))
      .addStringOption(opt => opt.setName('rank').setDescription('Your current rank').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View a profile')
      .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('edit')
      .setDescription('Edit multiple profile fields at once')
      .addStringOption(opt => opt.setName('gamertag').setDescription('Your gamertag').setRequired(false))
      .addStringOption(opt => opt.setName('bio').setDescription('Your bio').setRequired(false))
      .addStringOption(opt => 
        opt.setName('timezone')
          .setDescription('Your timezone')
          .setRequired(false)
          .addChoices(...TIMEZONES.map(tz => ({ name: tz, value: tz })))
      )
      .addStringOption(opt => opt.setName('pronouns').setDescription('Your pronouns').setRequired(false))
      .addStringOption(opt => 
        opt.setName('playstyle')
          .setDescription('Your preferred playstyle')
          .setRequired(false)
          .addChoices(
            { name: 'Casual', value: 'casual' },
            { name: 'Competitive', value: 'competitive' },
            { name: 'Hardcore', value: 'hardcore' }
          )
      )
      .addStringOption(opt => opt.setName('games').setDescription('Your favorite games (comma-separated)').setRequired(false))
      .addStringOption(opt => opt.setName('role').setDescription('Your main role in games').setRequired(false))
      .addStringOption(opt => opt.setName('rank').setDescription('Your current rank').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('game')
      .setDescription('Add or update game information in your profile')
      .addStringOption(opt => opt.setName('game').setDescription('Game name').setRequired(true))
      .addStringOption(opt => opt.setName('role').setDescription('Your main role in this game').setRequired(false))
      .addStringOption(opt => opt.setName('rank').setDescription('Your rank in this game').setRequired(false))
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
    sub.setName('game-config')
      .setDescription('Configure game information using configured roles and ranks')
      .addStringOption(opt => opt.setName('game').setDescription('Game name').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('games')
      .setDescription('View your configured games')
  );

// Enhanced LFG command
const lfgCommand = new SlashCommandBuilder()
  .setName('lfg')
  .setDescription('Looking for group system')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a LFG post (must be in game channel)')
      .addStringOption(opt => opt.setName('activity').setDescription('What are you looking to do?').setRequired(true))
      .addIntegerOption(opt => opt.setName('slots').setDescription('Number of players needed').setRequired(true))
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
  )
  .addSubcommand(sub =>
    sub.setName('cancel')
      .setDescription('Cancel your active LFG post')
  );

// Other commands (simplified for brevity)
const statsCommand = new SlashCommandBuilder()
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
      .addIntegerOption(opt => opt.setName('duration').setDescription('Match duration in minutes').setRequired(false))
      .addStringOption(opt => opt.setName('role').setDescription('Your role in the match').setRequired(false))
  );

const settingsCommand = new SlashCommandBuilder()
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
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const commands = [
  profileCommand,
  setupCommand,
  lfgCommand,
  statsCommand,
  settingsCommand,
  // Add other commands as needed
];

// Bot ready event
client.once('clientReady', async () => {
  console.log(`🎮 Enhanced Gaming Bot logged in as ${client.user.tag}`);
  
  cron.schedule('0 */6 * * *', () => {
    cleanupOldLFGPosts();
    console.log('🧹 Cleaned up old LFG posts');
  });

  cron.schedule('0 */1 * * *', () => {
    cleanupTempVoiceCategories();
    console.log('🧹 Cleaned up temporary voice categories');
  });

  cron.schedule('* * * * *', () => {
    checkLFGInactivity();
  });

  cleanupOldLFGPosts();
  cleanupTempVoiceCategories();
  checkLFGInactivity();

  try {
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(commands);
      console.log(`✅ Enhanced commands registered for guild: ${guild.name}`);
    }
  } catch (error) {
    console.error('Error registering enhanced commands:', error);
  }
});

// Enhanced interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user, guildId, guild } = interaction;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply().catch(() => {});
  }

  try {
    if (commandName === 'profile') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'create') {
        const gamertag = options.getString('gamertag');
        const bio = options.getString('bio') || '';
        const timezone = options.getString('timezone') || 'UTC';
        const pronouns = options.getString('pronouns') || '';
        const playstyle = options.getString('playstyle') || 'casual';
        const gamesString = options.getString('games');
        const role = options.getString('role');
        const rank = options.getString('rank');
        
        let profile = dataManager.getProfile(user.id, guildId);
        if (profile) {
          return interaction.editReply({
            content: '❌ You already have a profile! Use `/profile edit` to update it.'
          });
        }

        const gamePreferences = {
          playstyle: playstyle,
          competitiveLevel: playstyle === 'competitive' ? 'high' : 'medium',
          communication: 'both',
          availability: 'evenings',
          genres: gamesString ? gamesString.split(',').map(g => g.trim()) : []
        };

        const favoriteGames = gamesString ? gamesString.split(',').map(g => g.trim()) : [];

        profile = dataManager.createProfile(user.id, guildId, {
          gamertag,
          bio,
          timezone,
          pronouns,
          playstyle,
          favoriteGames,
          gamePreferences,
          stats: {
            ...dataManager.getProfile(user.id, guildId)?.stats || {},
            favoriteRole: role || 'Flex',
            rank: rank || 'Unranked'
          }
        });
        
        awardAchievement(user.id, guildId, 'first_profile');

        const embed = new EmbedBuilder()
          .setTitle('✅ Profile Created!')
          .setDescription(`Welcome, ${gamertag}! Your gaming profile has been created with enhanced details.`)
          .setColor('#00FF00')
          .addFields(
            { name: '🎮 Gamertag', value: gamertag, inline: true },
            { name: '🎯 Playstyle', value: playstyle, inline: true },
            { name: '🌐 Timezone', value: timezone, inline: true },
            { name: '💬 Communication', value: 'Voice & Text', inline: true },
            { name: '📝 Bio', value: bio || 'Not set', inline: false }
          )
          .setFooter({ text: 'Use /profile game to add specific games or /profile edit to update information' });

        if (favoriteGames.length > 0) {
          embed.addFields({ name: '🎮 Favorite Games', value: favoriteGames.join(', '), inline: true });
        }
        if (role) {
          embed.addFields({ name: ' Role', value: role, inline: true });
        }
        if (rank) {
          embed.addFields({ name: ' Rank', value: rank, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'edit') {
        const gamertag = options.getString('gamertag');
        const bio = options.getString('bio');
        const timezone = options.getString('timezone');
        const pronouns = options.getString('pronouns');
        const playstyle = options.getString('playstyle');
        const gamesString = options.getString('games');
        const role = options.getString('role');
        const rank = options.getString('rank');
        
        const profile = dataManager.getProfile(user.id, guildId);
        if (!profile) {
          return interaction.editReply({
            content: '❌ You need to create a profile first with `/profile create`.'
          });
        }

        const updates = {};
        if (gamertag) updates.gamertag = gamertag;
        if (bio !== null) updates.bio = bio;
        if (timezone) updates.timezone = timezone;
        if (pronouns !== null) updates.pronouns = pronouns;
        if (playstyle) updates.playstyle = playstyle;
        
        // Handle games, role, and rank updates
        if (gamesString) {
          updates.favoriteGames = gamesString.split(',').map(g => g.trim());
        }
        if (role || rank) {
          if (!updates.stats) updates.stats = {};
          if (role) updates.stats.favoriteRole = role;
          if (rank) updates.stats.rank = rank;
        }

        if (Object.keys(updates).length === 0) {
          return interaction.editReply({
            content: '❌ Please provide at least one field to update.'
          });
        }

        dataManager.updateProfile(user.id, guildId, updates);

        const embed = new EmbedBuilder()
          .setTitle('✅ Profile Updated')
          .setDescription('Your profile has been successfully updated with the following changes:')
          .setColor('#00FF00')
          .setTimestamp();

        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'stats') {
            if (value.favoriteRole) {
              embed.addFields({ name: 'Favorite Role', value: value.favoriteRole, inline: true });
            }
            if (value.rank) {
              embed.addFields({ name: 'Rank', value: value.rank, inline: true });
            }
          } else if (key === 'favoriteGames') {
            embed.addFields({ name: 'Favorite Games', value: value.join(', '), inline: true });
          } else {
            embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: value || 'Not set', inline: true });
          }
        });

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'game') {
        const gameName = options.getString('game');
        const role = options.getString('role');
        const rank = options.getString('rank');
        const hours = options.getInteger('hours');
        const skillLevel = options.getString('skill_level');

        const profile = dataManager.getProfile(user.id, guildId);
        if (!profile) {
          return interaction.editReply({
            content: '❌ You need to create a profile first with `/profile create`.'
          });
        }

        const gameConfig = dataManager.getGameConfig(guildId, gameName);
        const gameData = {
          role: role,
          rank: rank,
          hours: hours,
          skillLevel: skillLevel,
          updatedAt: new Date().toISOString()
        };

        if (gameConfig) {
          if (role && gameConfig.roles && gameConfig.roles.length > 0 && !gameConfig.roles.includes(role)) {
            return interaction.editReply({
              content: `❌ Invalid role. Available roles for ${gameName}: ${gameConfig.roles.join(', ')}`
            });
          }
          if (rank && gameConfig.ranks && gameConfig.ranks.length > 0 && !gameConfig.ranks.includes(rank)) {
            return interaction.editReply({
              content: `❌ Invalid rank. Available ranks for ${gameName}: ${gameConfig.ranks.join(', ')}`
            });
          }
        }

        dataManager.addGameToProfile(user.id, guildId, gameName, gameData);

        const embed = new EmbedBuilder()
          .setTitle('✅ Game Information Updated')
          .setDescription(`**${gameName}** information has been added to your profile`)
          .setColor('#00FF00')
          .addFields(
            { name: 'Game', value: gameName, inline: true },
            { name: 'Role', value: role || 'Not specified', inline: true },
            { name: 'Rank', value: rank || 'Not specified', inline: true },
            { name: 'Hours Played', value: hours ? `${hours} hours` : 'Not specified', inline: true },
            { name: 'Skill Level', value: skillLevel || 'Not specified', inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
      else if (subcommand === 'games') {
        const profile = dataManager.getProfile(user.id, guildId);
        if (!profile) {
          return interaction.editReply({
            content: '❌ You need to create a profile first with `/profile create`.'
          });
        }

        if (!profile.games || Object.keys(profile.games).length === 0) {
          return interaction.editReply({
            content: '❌ You haven\'t added any games to your profile yet. Use `/profile game` to add games.'
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('🎮 Your Games')
          .setColor('#5865F2')
          .setDescription('Here are the games you\'ve added to your profile:');

        Object.entries(profile.games).forEach(([gameName, gameData]) => {
          const fields = [];
          if (gameData.role) fields.push(`**Role:** ${gameData.role}`);
          if (gameData.rank) fields.push(`**Rank:** ${gameData.rank}`);
          if (gameData.hours) fields.push(`**Hours:** ${gameData.hours}`);
          if (gameData.skillLevel) fields.push(`**Skill:** ${gameData.skillLevel}`);

          embed.addFields({
            name: gameName,
            value: fields.join(' • ') || 'No additional information',
            inline: false
          });
        });

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
      else if (subcommand === 'game-config') {
        const gameName = options.getString('game');
        const profile = dataManager.getProfile(user.id, guildId);
        if (!profile) {
          return interaction.editReply({
            content: '❌ You need to create a profile first with `/profile create`.'
          });
        }

        const gameConfig = dataManager.getGameConfig(guildId, gameName);
        if (!gameConfig) {
          return interaction.editReply({
            content: `❌ No game configuration found for **${gameName}**. Please ask an admin to set it up with the setup command first.`
          });
        }

        // Create modal for game configuration
        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
        
        const modal = new ModalBuilder()
          .setCustomId(`game_config_${gameName}_${user.id}`)
          .setTitle(`Configure ${gameName} Profile`);
        
        // Role selection
        if (gameConfig.roles && gameConfig.roles.length > 0) {
          const roleInput = new TextInputBuilder()
            .setCustomId('role_input')
            .setLabel('Your role in this game')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Available: ${gameConfig.roles.join(', ')}`)
            .setRequired(false);
          
          modal.addComponents(new ActionRowBuilder().addComponents(roleInput));
        }
        
        // Rank selection
        if (gameConfig.ranks && gameConfig.ranks.length > 0) {
          const rankInput = new TextInputBuilder()
            .setCustomId('rank_input')
            .setLabel('Your rank in this game')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Available: ${gameConfig.ranks.join(', ')}`)
            .setRequired(false);
          
          modal.addComponents(new ActionRowBuilder().addComponents(rankInput));
        }
        
        // Hours played
        const hoursInput = new TextInputBuilder()
          .setCustomId('hours_input')
          .setLabel('Hours played')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter number of hours')
          .setRequired(false);
        
        modal.addComponents(new ActionRowBuilder().addComponents(hoursInput));
        
        // Skill level
        const skillInput = new TextInputBuilder()
          .setCustomId('skill_input')
          .setLabel('Skill level')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Beginner, Intermediate, Advanced, Expert, etc.')
          .setRequired(false);
        
        modal.addComponents(new ActionRowBuilder().addComponents(skillInput));
        
        await interaction.showModal(modal);
      }
    }
    else if (commandName === 'setup') {
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
      const rolesInput = options.getString('roles');
      const ranksInput = options.getString('ranks');

      const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;
      if (!colorRegex.test(color)) {
        return interaction.editReply({
          content: '❌ Invalid color format. Please use hex format (e.g., #FF5733).'
        });
      }

      const channelNames = channelsInput.split(',').map(name => name.trim()).filter(name => name.length > 0);

      if (channelNames.length === 0) {
        return interaction.editReply({
          content: '❌ Please provide at least one channel name.'
        });
      }

      await interaction.editReply({
        content: '🔄 Setting up game category and channels...'
      });

      try {
        const guild = interaction.guild;

        let gameRole = null;
        if (createRole) {
          gameRole = await guild.roles.create({
            name: gameName,
            color: color,
            reason: `Game role for ${gameName}`
          });
        }

        const categoryPermissionOverwrites = [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels]
          }
        ];

        if (gameRole) {
          categoryPermissionOverwrites.push({
            id: gameRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages]
          });
        }

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

        if (gameRole) {
          await interaction.member.roles.add(gameRole);
        }

        if (rolesInput || ranksInput) {
          const gameConfig = {
            roles: rolesInput ? rolesInput.split(',').map(r => r.trim()) : [],
            ranks: ranksInput ? ranksInput.split(',').map(r => r.trim()) : []
          };

          dataManager.createGameConfig(guildId, gameName, gameConfig);
        }

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

        if (rolesInput || ranksInput) {
          embed.addFields({
            name: '🎮 Game Configuration',
            value: `Roles: ${rolesInput || 'None'}\nRanks: ${ranksInput || 'None'}`,
            inline: false
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
    else if (commandName === 'lfg') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'create') {
        if (!canCreateLFG(user.id, guildId)) {
          return interaction.editReply({
            content: '❌ You already have an active LFG post! Please cancel your current LFG with `/lfg cancel` before creating a new one.'
          });
        }

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

        if (createPrivate) {
          const channels = await createPrivateLFGChannels(lfgPost, guild);
          if (channels) {
            dataManager.updateLFGPost(lfgPost.id, { privateChannels: channels });
          }
        }

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
      else if (subcommand === 'cancel') {
        const activeLFGs = dataManager.getUserActiveLFGPosts(guildId, user.id);
        
        if (activeLFGs.length === 0) {
          return interaction.editReply({
            content: '❌ You don\'t have any active LFG posts to cancel.'
          });
        }

        const lfgToCancel = activeLFGs[0];
        await expireLFGPost(lfgToCancel, 'Cancelled by user');

        await interaction.editReply({
          content: `✅ Your LFG post for **${lfgToCancel.game}** has been cancelled.`
        });
      }
      else if (subcommand === 'list') {
        const gameFilter = options.getString('game');
        let lfgPosts;
        
        if (gameFilter) {
          lfgPosts = dataManager.getLFGPostsByGame(guildId, gameFilter);
        } else {
          lfgPosts = dataManager.getAllLFGPosts(guildId);
        }
        
        if (lfgPosts.length === 0) {
          return interaction.editReply({
            content: `❌ No active LFG posts found${gameFilter ? ` for ${gameFilter}` : ''}!`
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🔍 Active LFG Posts${gameFilter ? ` - ${gameFilter}` : ''}`)
          .setColor('#00FF00')
          .setDescription(lfgPosts.map(post => {
            const timeAgo = Math.floor((new Date() - new Date(post.createdAt)) / (1000 * 60));
            const timeText = timeAgo < 1 ? 'Just now' : 
                           timeAgo < 60 ? `${timeAgo}m ago` : 
                           `${Math.floor(timeAgo / 60)}h ago`;
            
            return `**${post.game}** - ${post.activity}\n` +
                   `👥 ${post.participants.length}/${post.slots} • 🎮 ${post.playstyle} • 🕐 ${timeText}\n` +
                   `ID: ${post.id}\n`;
          }).join('\n'));

        await interaction.editReply({ embeds: [embed] });
      }
    }
    else if (commandName === 'stats') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'view') {
        const targetUser = options.getUser('user') || user;
        const profile = dataManager.getProfile(targetUser.id, guildId);

        if (!profile) {
          return interaction.editReply({
            content: `❌ ${targetUser.id === user.id ? 'You don\'t have' : 'This user doesn\'t have'} a profile yet. Use \`/profile create\` to make one.`
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`📊 ${targetUser.username}'s Stats`)
          .setColor('#5865F2')
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: '🎮 Level', value: `${profile.level}`, inline: true },
            { name: '⭐ XP', value: `${profile.xp}`, inline: true },
            { name: '🏆 Reputation', value: `${profile.reputation}`, inline: true },
            { name: '🎯 Games Played', value: `${profile.stats.gamesPlayed || 0}`, inline: true },
            { name: '⏰ Hours Played', value: `${profile.stats.hoursPlayed || 0}`, inline: true },
            { name: '📈 Win/Loss', value: `${profile.stats.matchesWon || 0}/${profile.stats.matchesLost || 0}`, inline: true },
            { name: '🔥 Win Streak', value: `${profile.stats.winStreak || 0}`, inline: true },
            { name: '🏅 Best Streak', value: `${profile.stats.bestWinStreak || 0}`, inline: true },
            { name: '📋 Rank', value: profile.stats.rank || 'Unranked', inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    }
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

// Track activity in private channels
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  
  const lfgPosts = Object.values(dataManager.lfgPosts).filter(post => 
    post.status === 'active' && 
    post.privateChannels && 
    post.privateChannels.textChannelId === message.channel.id
  );
  
  if (lfgPosts.length > 0) {
    updateLFGActivity(lfgPosts[0].id);
  }

  // Achievement tracking
  const profile = dataManager.getProfile(message.author.id, message.guild.id);
  if (!profile) return;

  if (!profile.achievements?.includes('social_butterfly')) {
    const userLFGCount = Object.values(dataManager.lfgPosts).filter(post => 
      post.participants.includes(message.author.id)
    ).length;

    if (userLFGCount >= 20) {
      awardAchievement(message.author.id, message.guild.id, 'social_butterfly');
    }
  }

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

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (!newState.member) return;
  
  if (newState.channelId) {
    const lfgPosts = Object.values(dataManager.lfgPosts).filter(post => 
      post.status === 'active' && 
      post.privateChannels && 
      post.privateChannels.voiceChannelId === newState.channelId
    );
    
    if (lfgPosts.length > 0) {
      updateLFGActivity(lfgPosts[0].id);
    }
  }
});

// Welcome new members
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