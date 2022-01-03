const { SlashCommandBuilder } = require('@discordjs/builders');
const { Collection, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const { v4:uuidv4 } = require ('uuid');

const fs = require('fs');
const infoName = '../info.json';
const info = require(infoName);

module.exports = {
	data: new SlashCommandBuilder()
	    .setName("deletegames")
	    .setDescription("Remove all games after [index] and up to [length]. default is 0 and total games respectively")
	    .addStringOption(option =>
		    option
		        .setName("index")
		        .setDescription("[Optional] Remove only on and after given index.")
		        .setRequired(false),
        )
        .addStringOption(option =>
		    option
		        .setName("length")
		        .setDescription("[Optional] Remove only up to given length.")
		        .setRequired(false),
        ),
	    async execute(interaction) {

        // https://stackoverflow.com/questions/37271445/convert-string-to-number-node-js
        // - tejp124
        function cleanInt(x) {
            x = Number(x);
            return x >= 0 ? Math.floor(x) : Math.ceil(x);
        }

        var index = 0;
        var length = 0;
        var deletes = 0;

        //Check that both parameters are not null and are not leading to out-of-bounds issues
        index = cleanInt(interaction.options.getString("index"));
        if(!(index != null && index > 0 && index <= info.games.length))
            index = 0; //Default value

        length = cleanInt(interaction.options.getString("length"));
        if(!(length != null && length > 0 && index + length <= info.games.length))
            length = info.games.length - index; //Default value

        for(var i = index; i < index + length; length--, deletes++) {
            console.log(i);
            console.log(info.games[i]);
            const fancyTitle = info.games[i].fancyLabel;
            const title = info.games[i].label;
            
            //Role Availability
            let role = await interaction.guild.roles.cache.find(x => x.name == fancyTitle);

            //Text Channel Availability
            let channel = await interaction.guild.channels.cache.find(x => (x.name == title && x.type == "GUILD_TEXT"));

            //Voice Channel Availability
            let channelVC = await interaction.guild.channels.cache.find(x => (x.name == title && x.type == "GUILD_VOICE"));

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
        }

		if(deletes > 0) {

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

            //Return, and reply how many games were deleted and what start index the deletes were made on
			return await interaction.reply("Pong: Removal of (" + deletes + ") item(s) starting at index '" + index + "' completed"); 
		}

        //Reply that no games were deleted for due to no match
		await interaction.reply("Pong: No removal(s) were made from given arugments, or there are no more games to delete");
	}
};