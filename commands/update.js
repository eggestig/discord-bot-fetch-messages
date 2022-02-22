const { SlashCommandBuilder }                           = require('@discordjs/builders');
const { update }                                        = require('./methods/sheet.js');
const SETTINGS                                          = require('./methods/misc.js');
const { saveWordFreqFromLocalFiles, sortWordFrequency } = require('./saveMessages.js');

module.exports = {
	data: new SlashCommandBuilder()
	  	.setName("update")
	  	.setDescription("Save Words and their frequency from local files"),
    async execute(interaction) {
        const startTime = Date.now();

        

        await interaction.deferReply().then(async () => {
            await update(saveWordFreqFromLocalFiles, sortWordFrequency);
            
            //Reply
            const totalTime = SETTINGS.calculateTimeDifference(startTime, Date.now());
            console.log("Update completed in: " + totalTime)
            await interaction.followUp("Update completed in: " + totalTime);
        });
	}
};