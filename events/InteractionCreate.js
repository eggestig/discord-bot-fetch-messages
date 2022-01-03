const fs = require('fs');
const { Collection } = require('discord.js');

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		//Get all command files
		interaction.client.commands = new Collection();
		const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

		//Set all commands
		for (const file of commandFiles) {
			const command = require(`../commands/${file}`);
			interaction.client.commands.set(command.data.name, command);
		}

		//Check that the interaction is a slash command
		if (!interaction.isCommand()) return;
		
		//Check that the slash command is a real command
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) return;

		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered a slash command. `);
		console.log("Command executing... - " + interaction.commandName);

		//Execute the slash command
		try {
			await command.execute(interaction);
			console.log("Command completed!   - " + interaction.commandName);
		} catch (error) {
			console.error(error);
			return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	
	}
};