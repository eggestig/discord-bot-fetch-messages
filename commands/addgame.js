const { SlashCommandBuilder } = require('@discordjs/builders');
const { Collection, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const { v4:uuidv4 } = require ('uuid');
const { guildId } = require('../config.json');
const fs = require('fs');
const infoName = '../info.json';
const info = require(infoName);
    

module.exports = {
	data: new SlashCommandBuilder()
	  	.setName("addgame")
	  	.setDescription("Add a game (up to 25 games are currently supported)")
	  	.addStringOption(option =>
			option
		  		.setName("title")
		  		.setDescription("Enter the title of a game to add")
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
		
		if(info.games.length >= 25)
			return await interaction.reply("Pong: Max games allotted, remove one to add a new one"); 

		//Role Availability
		var roleId;
		let role = await interaction.guild.roles.cache.find(x => x.name == fancyTitle);

		//Text Channel Availability
		var textChannelId;
		let channel = await interaction.guild.channels.cache.find(x => (x.name == title && x.type == "GUILD_TEXT"));

		//Voice Channel Availability
		var voiceChannelId;
		let channelVC = await interaction.guild.channels.cache.find(x => (x.name == title && x.type == "GUILD_VOICE"));
		
		console.log(channel);

		//Create channel VC, channel, and role if none of them exists
		if(!channelVC && !channel && !role) {

			const categoryName = "━━Game-Category━";
			let category = interaction.guild.channels.cache.find(c => c.name == categoryName && c.type == "GUILD_CATEGORY");
			var categoryId;

			//Set categoryId to the existing category if it exists, otherwise create it
			if (category) {
				categoryId = category.id;
			} else {
				console.error(`One of the channels is missing:\nCategory: ${!!category}\nChannel: ${!!channel}`);
				console.error("Creating category: '" + categoryName + "'...");

				//Make category
				console.log(interaction.guild.me._roles[0])
				await interaction.guild.channels.create(categoryName, {
					type: 'GUILD_CATEGORY',
					permissionsOverwrites: [{
					  id: guildId,
					  deny: ['MANAGE_MESSAGES'],
					  allow: ['SEND_MESSAGES']
					}]
				}).catch((error) => {
					console.error(error);
				}).then((res) => {
					console.log(res);
					console.log("category created. ID: " + res.id);
					categoryId = res.id;
				});
			}

			//make role
			await interaction.guild.roles.create({
				name: fancyTitle,		
				permissions: [],
				color: "BLUE",
				reason: "new game added"
			}).catch((error) => {
				console.error(error);
			}).then((res) => {
				console.log("Role created. ID: " + res.id);
				roleId = res.id;
			});

			//make channel
			console.log(interaction.guild.me._roles[0])
			await interaction.guild.channels.create(title, {
				"type": "GUILD_TEXT",
				"permissionOverwrites": [
					{
						'id': guildId, 
						'deny': ['CREATE_INSTANT_INVITE', 'VIEW_CHANNEL']
					},
					{
						'id': roleId, 
						'allow': ['VIEW_CHANNEL']
					},
					{
						'id': interaction.guild.me._roles[0], 
						'allow': ['VIEW_CHANNEL', 'MANAGE_CHANNELS']
					}
				],
				"parent": categoryId

			}).catch((error) => {
				console.error(error);
			}).then((res) => {
				console.log("Text channel created. ID: " + res.id);
				textChannelId = res.id;
			});

			//make channel VC
			await interaction.guild.channels.create(title, {
				type: "GUILD_VOICE",
				permissionOverwrites: [
					{
						'id': guildId, 
						'deny': ['CREATE_INSTANT_INVITE', 'VIEW_CHANNEL', 'CONNECT']
					},
					{
						'id': roleId, 
						'allow': ['VIEW_CHANNEL', 'CONNECT']
					},
					{
						'id': interaction.guild.me._roles[0], 
						'allow': ['VIEW_CHANNEL', 'MANAGE_CHANNELS', 'CONNECT']
					}
				],
				"parent": categoryId
			}).catch((error) => {
				console.error(error);
			}).then((res) => {
				console.log("Voice channel created. ID: " + res.id);	
				voiceChannelId = res.id;
				console.log("Voice channel permissions edited. ID: " + res.id);	
			});

			//Add game to the array of games in the .json
			info.games.push({
				"id": uuidv4(),
				"label": title,
				"fancyLabel": fancyTitle,
				"style": "SECONDARY",
				"roleId": roleId,
				"textChannelId": textChannelId,
				"voiceChannelId": voiceChannelId 
			});

			//Write .json change to file
			await fs.writeFile('./info.json', JSON.stringify(info, null, 2), function writeJSON(err) {
				if (err) return console.log(err);
				console.log(JSON.stringify(info, null, 2));
				console.log('writing to ' + './info.json');
			});

			//Reply that a new game has been added
			await interaction.reply("Pong: New game added: " + fancyTitle);
		}
		else {
			//Reply that channel VC, channel, and/or role already exists
			await interaction.reply("Voice/channel/role already exists");
		}
	}
};