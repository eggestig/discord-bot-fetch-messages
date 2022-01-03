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

async function convertToWordFrequency(messages) {
    let out = {};
    
    messages.forEach(async (msg) => {
        const re = /[ \n]/;
        //console.log("Messages: '" + msg.content + "'")
        if(msg.content.length > 1 /*&& !msg.author.bot*/) {
            //console.log("ok: '" + msg.content + "'");
            const words = msg.content.split(re);
            words.forEach(async (word) => {
                if(word.length > 1) 
                    (out[word] != null) ? out[word]++ : out[word] = 1;
                    
            });
        }
        
    });
    
    return out;
};

async function sortWordFrequency(words) {
    var sortable = [];
    var length = 0;
    for (var word in words) {
        sortable.push([word, words[word]]);
        length++;
    }

    sortable.sort(function(a, b) {
        return a[1] - b[1];
    });

    var objSorted = {}
    sortable.forEach(function(item){
        objSorted[item[0]]=item[1]
    })
    return {length: length, words: objSorted};
}

module.exports = {
	data: new SlashCommandBuilder()
	  	.setName("savewordfreq")
	  	.setDescription("Save Words and their frequency")
        .addChannelOption(option => option.setName('destination').setDescription('Select a channel')),
	async execute(interaction) {
        const startTime = Date.now();

        

        await interaction.deferReply().then(async () => {
            //code here
            
            const channel = interaction.options.getChannel('destination');

            console.log(channel);
            //Fetch messages
            const fetchMsgsStart = Date.now();
            let result = await getMessages(channel, 1000000); // One million max
            const fetchMsgsTotal = ((Date.now() - fetchMsgsStart)/1000).toFixed(2);

            //Write messages to file
            const date = new Date();
            const dateString = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + "-" + date.getHours() + "-" + date.getMinutes() + "-" + date.getSeconds()
            fs.writeFile("saveFiles/" + channel.name + "-" + dateString + ".json", JSON.stringify(result, null, 2), 'utf8', (callback) => {
                console.log("written");
            });
            
            //Convert messages to words & their frequency
            const convWordFreqStart = Date.now();
            let wordFreq = await convertToWordFrequency(result.messages);
            const convWordFreqTotal = ((Date.now() - convWordFreqStart)/1000).toFixed(2);

            //Sort by frequency (high -> low)
            const sortWordFreqStart = Date.now();
            let sortedResult = await sortWordFrequency(wordFreq);
            const sortWordFreqTotal = ((Date.now() - sortWordFreqStart)/1000).toFixed(2);

            //Total time
            const total = ((Date.now() - startTime)/1000).toFixed(2);

            //Logs
            //console.log(wordFreq);
            console.log(sortedResult.words);
            console.log("RESULT: ("         + result.length      + ") message(s) fetched | (" + sortedResult.length + ")");
            console.log("Time (Fetch): "    + fetchMsgsTotal     + " seconds");
            console.log("Time (Convert): "  + convWordFreqTotal  + " seconds");
            console.log("Time (Sort): "     + sortWordFreqTotal  + " seconds");
            console.log("Time (Total): "    + total              + " seconds");
            //console.log(messages);



            //Reply
            await interaction.followUp("RESULT: (" + result.length + ") message(s) fetched in (" + total + ") seconds");
        });
	}
};