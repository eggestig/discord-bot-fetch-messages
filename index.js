const fs 					= require('fs');
const { Client, Intents  } 	= require('discord.js'); 

/* Local */
const SETTINGS 				= require('./commands/methods/misc.js');

const client = new Client({ intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ] });

//Events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

//Start bot
client.login(SETTINGS.getSettings().discord.token);