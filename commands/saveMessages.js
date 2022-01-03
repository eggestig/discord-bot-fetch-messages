const { SlashCommandBuilder } = require('@discordjs/builders');

var fs = require('fs');
const info = "Ember_Sword_dump_2022-01-03_021023.660000.txt";

Array.prototype.extend = function (other_array) {
    other_array.forEach(function(v) {this.push(v)}, this);
}

async function getMessages(channel, limit) {
    let out = [];
    if (limit <= 100) {
        const messages = await channel.messages.fetch({ limit: limit });
        const messagesArr = Array.from(messages.values());
        out.extend(messagesArr);    
    } else {
        let rounds = (limit / 100) + (limit % 100 ? 1 : 0)
        console.log(rounds);
        let lastId = null;
        for (let x = 0; x < rounds; x++) {
            console.log(x);
            options = {
                limit: 100
            };

            if (lastId != null) 
                options.before = lastId; 
            

            const messages = await channel.messages.fetch(options);
            const messagesArr = Array.from(messages.values());
            out.extend(messagesArr);
            lastId = messagesArr[(messagesArr.length - 1)].id;

            if(messagesArr.length < 100)
                break;
        
        };
    };

    return {length: out.length, messages: out};
};

module.exports = {
	data: new SlashCommandBuilder()
	  	.setName("savemessages")
	  	.setDescription("Save Messages"),
	async execute(interaction) {
        const startTime = Date.now();

        

        await interaction.deferReply().then(async () => {
            //code here
            

            let channel = interaction.guild.channels.cache.get(interaction.channelId);

            //Fetch messages
            const fetchMsgsStart = Date.now();
            let result = await getMessages(channel, 1000000); // One million max
            const fetchMsgsTotal = ((Date.now() - fetchMsgsStart)/1000).toFixed(2);

            //Write messages to file
            const writeMsgsStart = Date.now();
            fs.writeFile('messages.json', JSON.stringify(result, null, 2), 'utf8', (callback) => {
                console.log("written");
            });
            const writeMsgsTotal = ((Date.now() - fetchMsgsStart)/1000).toFixed(2);

            //Total time
            const total = ((Date.now() - startTime)/1000).toFixed(2);

            //Logs
            console.log(sortedResult.words);
            console.log("RESULT: ("         + result.length      + ") message(s) fetched | (" + sortedResult.length + ")");
            console.log("Time (Fetch): "    + fetchMsgsTotal     + " seconds");
            console.log("Time (Write): "  + convWordFreqTotal  + " seconds");
            console.log("Time (Total): "    + total              + " seconds");



            //Reply
            await interaction.followUp("RESULT: (" + result.length + ") message(s) fetched in (" + total + ") seconds");
        });
	}
};