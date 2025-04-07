require("dotenv").config(); // Load environment variables
const { Client, GatewayIntentBits } = require("discord.js");
const { db } = require("./firebaseAdmin");

// Discord bot token from .env
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!botToken) {
  console.error("❌ Bot token not found. Please add DISCORD_BOT_TOKEN to your .env file.");
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

// Save new guild to Firestore
client.on("guildCreate", async (guild) => {
  try {
    await db.collection("discordServers").doc(guild.id).set({
      guildId: guild.id,
      guildName: guild.name,
      ownerId: guild.ownerId,
      addedAt: new Date().toISOString(),
    });
    console.log(`📥 Joined guild: ${guild.name}`);
  } catch (error) {
    console.error("Error saving guild:", error);
  }
});

// Remove guild from Firestore
client.on("guildDelete", async (guild) => {
  try {
    await db.collection("discordServers").doc(guild.id).delete();
    console.log(`📤 Removed from guild: ${guild.name}`);
  } catch (error) {
    console.error("Error removing guild:", error);
  }
});

// Start bot
client.login(botToken);