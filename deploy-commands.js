const fs 							= require('fs');
const { REST } 						= require('@discordjs/rest');
const { Routes } 					= require('discord-api-types/v9');

/* Local */
const SETTINGS 						= require('./commands/methods/misc.js');

//Get all command files
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(SETTINGS.getSettings().discord.token);

//Update
(async () => {
	try {
		console.log('Started refreshing application (/) commands.');


		const result = await rest.put(
			Routes.applicationGuildCommands(SETTINGS.getSettings().discord.clientId, SETTINGS.getSettings().discord.guildId),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
		console.error(error.rawError.errors[2]);
	}
})();