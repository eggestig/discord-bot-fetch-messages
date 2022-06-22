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

		let permissions = [];
		result.forEach((command) => {
			permissions.push({
				"id": command.id,
				"permissions": [
					{
						"id": "451264105165225995", //Thanabus citizen
						"type": 1,
						"permission": false
					},
					{
						"id": "491195420597420033", //BSS role
						"type": 1,
						"permission": true
					},
					{
						"id": "137937860400513024", //Eggestig user
						"type": 2,
						"permission": true
					}
				]
			});
		})
			
		await rest.put(
			Routes.guildApplicationCommandsPermissions(SETTINGS.getSettings().discord.clientId, SETTINGS.getSettings().discord.guildId),
			{ body: permissions }
		);	

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
		console.error(error.rawError.errors[2]);
	}
})();