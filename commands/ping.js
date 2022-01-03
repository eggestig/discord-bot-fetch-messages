const { SlashCommandBuilder } = require('@discordjs/builders');
const { channel } = require('diagnostics_channel');

var fs = require('fs');
const info = "Ember_Sword_dump_2022-01-03_021023.660000.txt";

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		let msg = "";
		let i = 0;
		let channel = interaction.guild.channels.cache.get(interaction.channelId);
				
		function sleep(ms) {
			return new Promise((resolve) => {
			setTimeout(resolve, ms);
			});
		}
		var total = 0;

		require('fs').readFileSync(info, 'utf-8').split(/[\n]/).forEach(async function(line){
			if(i >= 60) { // send x lines 
				channel.send(msg);
				i = 0;
				msg = "";
				await sleep(5000);
			}
			if(total >= 30955) { // skip x amount of lines
				msg += line + "\n";
				i++;
			} else {
				if(total % 1000 == 0) {
					console.log(total);
				}
			}
			total++;
		});

		await interaction.reply('Pong!');
	},
};