require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const axios = require("axios");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DATABASE = "./database.json";

let players = {};

if (fs.existsSync(DATABASE)) {
  players = JSON.parse(fs.readFileSync(DATABASE));
}

function saveDatabase() {
  fs.writeFileSync(DATABASE, JSON.stringify(players, null, 2));
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");

  // REGISTER
  if (args[0] === "!register") {
    const albionName = args[1];

    if (!albionName) {
      return message.reply("Masukkan nama Albion.");
    }

    players[message.author.id] = {
      albionName,
      lastKillId: null
    };

    saveDatabase();

    message.reply(`Berhasil register: ${albionName}`);
  }

  // UNREGISTER
  if (args[0] === "!unregister") {
    delete players[message.author.id];
    saveDatabase();

    message.reply("Berhasil unregister.");
  }
});

async function checkKills() {
  for (const discordId in players) {
    const player = players[discordId];

    try {
      const response = await axios.get(
        `https://gameinfo.albiononline.com/api/gameinfo/search?q=${player.albionName}`
      );

      const foundPlayer = response.data.players[0];

      if (!foundPlayer) continue;

      const killResponse = await axios.get(
        `https://gameinfo.albiononline.com/api/gameinfo/players/${foundPlayer.Id}/kills`
      );

      const kills = killResponse.data;

      if (!kills.length) continue;

      const latestKill = kills[0];

      if (latestKill.EventId === player.lastKillId) continue;

      players[discordId].lastKillId = latestKill.EventId;
      saveDatabase();

      const totalKillFame = latestKill.TotalVictimKillFame;

      const victim = latestKill.Victim.Name;

      const embed = new EmbedBuilder()
        .setTitle("⚔️ Albion Kill")
        .setDescription(`<@${discordId}> mendapatkan kill!`)
        .addFields(
          {
            name: "Victim",
            value: victim,
            inline: true
          },
          {
            name: "Kill Fame",
            value: totalKillFame.toLocaleString(),
            inline: true
          }
        )
        .setColor("Red")
        .setTimestamp();

      const channel = await client.channels.fetch(process.env.CHANNEL_ID);

      if (channel) {
        channel.send({
          embeds: [embed]
        });
      }
    } catch (err) {
      console.log(err.message);
    }
  }
}

setInterval(checkKills, 30000);

client.login(process.env.TOKEN);