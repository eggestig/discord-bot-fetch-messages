const { SlashCommandBuilder } = require('@discordjs/builders');
const { Collection, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const { v4:uuidv4 } = require ('uuid');

const fs = require('fs');
const infoName = '../info.json';
const info = require(infoName);

module.exports = {
	data: new SlashCommandBuilder()
	  	.setName("deletegame")
	  	.setDescription("Remove a game (Use the name of the role or the button text in /displaygames)")
	  	.addStringOption(option =>
			option
		  		.setName("title")
		  		.setDescription("Enter the title of a game to delete")
		  		.setRequired(true)
	  	),
	async execute(interaction) {

		//https://stackoverflow.com/questions/2116558/fastest-method-to-replace-all-instances-of-a-character-in-a-string/2116614
		// - qwerty (Edited by Colorfully Monochrome)
		String.prototype.replaceAll = function(str1, str2, ignore) {
			return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
		} 

		const fancyTitle = interaction.options.getString("title");
		const title = fancyTitle.replaceAll(' ', '-').toLowerCase();
		
		//Role Availability
		var roleId;
		let role = await interaction.guild.roles.cache.find(x => x.name == fancyTitle);

		//Text Channel Availability
		var textChannelId;
		let channel = await interaction.guild.channels.cache.find(x => (x.name == title && x.type == "GUILD_TEXT"));

		//Voice Channel Availability
		var voiceChannelId;
		let channelVC = await interaction.guild.channels.cache.find(x => (x.name == title && x.type == "GUILD_VOICE"));

		
		for(var i = 0; i < info.games.length; i++) {
			if(info.games[i].label == title) {
				//Delete game
				console.log("deleting .json game: '" + fancyTitle + "'");
				info.games.splice(i, 1);

				//Delete role
				if(role) {
					console.log("deleting role: '" + fancyTitle + "'");
					role.delete();
				} else {
					console.log("No role found: '" + fancyTitle + "'");
				}
				
				//Delete text channel
				if(channel) {
					console.log("deleting text channel: '" + title + "'");
					channel.delete();
				} else {
					console.log("No text channel found: '" + title + "'");
				}

				//Delete voice channel
				if(channelVC) {
					console.log("deleting voice channel: '" + title + "'");
					channelVC.delete();
				} else {
					console.log("No voice channel found: '" + title + "'");
				}

				//Delete Category if no games left
				const categoryName = "━━Game-Category━";
				let category = interaction.guild.channels.cache.find(c => c.name == categoryName && c.type == "GUILD_CATEGORY");
	
				if(info.games.length < 1 && category)
					category.delete();
	

				//Write .json deletion to file
				await fs.writeFile('./info.json', JSON.stringify(info, null, 2), function writeJSON(err) {
					if (err) return console.log(err);
					console.log(JSON.stringify(info, null, 2));
					console.log('writing to ' + './info.json');
				});

            	//Return, and reply what game was deleted
				return await interaction.reply("Pong: Removal of game matching the title '" + title + "' completed"); 
			}
		}

		//Reply that no games were deleted for due to no match
		await interaction.reply("Pong: No removal was made due to no match found for the title '" + title + "'");
	}
};