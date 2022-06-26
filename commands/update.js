const { SlashCommandBuilder }                           = require('@discordjs/builders');
const { update }                                        = require('./methods/sheet.js');
const SETTINGS                                          = require('./methods/misc.js');
const { saveWordFreqFromLocalFiles, sortWordFrequency, saveWordInfoFromLocalFiles } = require('./save.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("update")
		.setDescription("-"),
	async execute(interaction) {
		const startTime = Date.now();

		//Only Eggestig or BSS are authorized
		if (interaction.user.id == "137937860400513024" || interaction.member.roles.cache.has("491195420597420033")) {
			await interaction.deferReply().then(async () => {
				let reply = true;
				setTimeout(async () => {
					if(reply) {
						const totalTime = SETTINGS.calculateTimeDifference(startTime, Date.now());
						await interaction.followUp("RESULT: Stats still being updated after (" + totalTime + ") seconds...\nCheck terminal for updates");
						reply = false;
					}
				}, 14 * 60); // 14 minutes, after 15 minutes you cannot use followUp. Without using msg sending priviliges (to send a msg and then edit that one to update) I don't think it's possible to provide updates after that
				await update(saveWordFreqFromLocalFiles, sortWordFrequency, saveWordInfoFromLocalFiles, interaction);
				if(reply) {//Possible, but unlikely, to reply twice due to nature of shared variable (i.e. reply)
					const totalTime = SETTINGS.calculateTimeDifference(startTime, Date.now());
					console.log("Update completed in: " + totalTime)
					await interaction.followUp("Update completed in: " + totalTime);
					reply = false;
				}
			});
		} else {
			await interaction.reply("Not authorized");
		}
	}
};