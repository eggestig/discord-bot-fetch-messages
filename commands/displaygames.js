const { SlashCommandBuilder } = require('@discordjs/builders');
const { Collection, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const info = require("../info.json");

module.exports = {
	data: new SlashCommandBuilder()
	  	.setName("displaygames")
	  	.setDescription("List all games and allows you to pick roles (which gives access to text and voice channels)"),
	async execute(interaction) {

		//Return a message button object with given parameters
		function msgBtn(id, fancyLabel, style) {
			return new MessageButton()
				.setCustomId(id)
				.setLabel(fancyLabel)
				.setStyle(style);
		}

		//Base card embed
		const base = new MessageEmbed()
		.setTitle(info.gameEmbed.title)
		.setColor(0xffd1dc)
		.setDescription(info.gameEmbed.subTitle)
		.setImage(info.gameEmbed.image);

		//Create buttons
		var matrix = new Array(5);
		var len = info.games.length;
		var rowElems = 5;
		var rowsFilled = 0;

		//Loop as long as there are more games to display
		while(0 < len) {

			//Set rowElems to be between 0 and 5 (inclusive)
			rowElems = (len - 5 < 0 ) ? len : 5;
			var arr = new Array(rowElems);

			//Add buttons to a row
			for(var i = 0; i < rowElems; i++) {
				var game = info.games[i + (5*rowsFilled)];
				arr[i] = msgBtn(game.id, game.fancyLabel, game.style); // Add up to 5 buttons
			}

			//Append the row
			matrix[rowsFilled++] = new MessageActionRow().addComponents(arr); // Add buttons to row

			//remove the used elements
			len -= rowElems;	
		}

		//shrink matrix if unused rows exist
		matrix.length = rowsFilled;

		//Reply with the embed and the buttons
		await interaction.reply({ embeds: [base], components: matrix });
	}
};