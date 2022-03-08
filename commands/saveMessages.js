const { SlashCommandBuilder }                           = require('@discordjs/builders');
const { CommandInteraction, TextChannel, Permissions }  = require('discord.js');
const fs                                                = require('fs');

/* Local */
const { write, read }               = require('./methods/fileHandler.js');
const {update, parseMessageJson }   = require('./methods/sheet.js');
const SETTINGS                      = require('./methods/misc.js');


/* --------------- */
/*     Channel     */
/* --------------- */

/**
 * Get channels from the settings
 * 
 * @param {CommandInteraction} interaction This is the interaction object from the slash command
 */
 async function getChannels(interaction) {
    const startTime = Date.now();

    const permissions = new Permissions([
        Permissions.FLAGS.VIEW_CHANNEL,
        Permissions.FLAGS.READ_MESSAGE_HISTORY
    ])

    let result = [];

    SETTINGS.refreshSettings();

    console.log(`+-----------------------------+`);
    console.log(`|     Accessible Channels     |`);
    console.log(`+-----------------------------+`);

    interaction.guild.channels.cache.forEach((channel) => {
        //Push channel to result if it covers the above conditions 

        if(channel.permissionsFor(interaction.guild.me).has("VIEW_CHANNEL") 
            && (   channel.type == "GUILD_TEXT" 
                || channel.type == "GUILD_PUBLIC_THREAD" 
                || channel.type == "GUILD_PRIVATE_THREAD")) {
            console.log(`| ${channel.name}`.padding(29) + ` |`);
            result.push(channel);
        }
    });
    console.log(`+-----------------------------+`);
    console.log(`| Total Channels Fetched: ${result.length}`.padding(29) + ` |`);
    console.log(`+-----------------------------+`);
    console.log();
    console.log("*******************************************************************************************");

    const totalTime = SETTINGS.calculateTimeDifference(startTime, Date.now());
    return {result: {length: result.length, channels: result}, totalTime: totalTime};
};


/* --------------- */
/*     Message     */
/* --------------- */

/**
 * Save messages to file(s)
 * 
 * @param {CommandInteraction} interaction This is the interaction object from the slash command
 * @param {number} total Up to total messages to fetch (No limit, but will save a file for every x messages)
 * @returns {Promise<Object>} number of messages saved, and runtime for the function
 */
async function saveMessages(interaction, totalMessages) {
    const startTime = Date.now();

    //Fetch channels
    console.log();
    console.log(`Fetching channels...`);
    const channelRes = await getChannels(interaction);

    //Delete saved messages
    console.log();
    deleteSavedMessagesFiles();
    
    //Fetch messages
    console.log();
    console.log(`Fetch and save messages...`);
    const savedMessagesRes = await saveMessagesHelper(channelRes.result.channels, totalMessages);
    //console.log(`Total messages saved: ${savedMessagesRes.totalMessagesSaved}`);

    //Update spreadsheet
    console.log();
    console.log(`Updating spreadsheet...`);
    await update(saveWordFreqFromLocalFiles, sortWordFrequency);
    console.log(`Spreadsheet updated`);

    //Total time
    const total = SETTINGS.calculateTimeDifference(startTime, Date.now());

    //Logs
    console.log();
    console.log(`${"Total time for /saveMessages".padding(30)} | ${total}s | ${savedMessagesRes.totalMessagesSaved}`);

    return {quantity: savedMessagesRes.totalMessagesSaved, runtime: total};
};

/**
 * Get messages helper function
 * 
 * @param {TextChannel[]} channels Channels to fetch messages from
 * @param {number} total Up to total messages to fetch (No limit, but will save a file for every x messages)
 * @returns {Promise} Array of parsed messages
 */
async function saveMessagesHelper(channels, total) {
    let totalMessagesSaved   = 0;
    const maxMessagesPerFile = SETTINGS.getSettings().messages.maxMessagesPerFile;
    let result               = {length: 0, messages: []};
    let messagesChunk        = null;
    let messagesToFetch      = 0;

    if(total > 0) 
        deleteSavedMessagesFiles();

    for(let i = 0; i < channels.length; i++) {
        const channel       = channels[i];
        let before          = null;
        let channelMessages = 0;
        
        console.log(`+---------------------------------------------------+`);
        console.log(`| Fetching Messages: `+ `${channel.name}`.padding(30) +` |`);
        console.log(`+---------------------------------------------------+`);

        let lastFileObj = null;
        let files = fs.readdirSync(`${SETTINGS.getSettings().messages.save.folder}/`);

        if(files && files.length > 0) {
            files.sort();
            lastFileObj = JSON.parse(read(`${SETTINGS.getSettings().messages.save.folder}/${files[files.length - 1]}`));
            if(lastFileObj) {
                result.messages = lastFileObj.messages;
                result.length = lastFileObj.length;
            }
        }

        while(((total < maxMessagesPerFile) ? messagesToFetch = total : messagesToFetch = maxMessagesPerFile) && messagesToFetch > 0) {
            if(result.length >= maxMessagesPerFile) {
                const sliceArr = result.messages.slice(0, maxMessagesPerFile);
                if(lastFileObj && lastFileObj.length < maxMessagesPerFile) {
                    console.log(`+--------------- Append to last file ---------------+`);
                    write(`${SETTINGS.getSettings().messages.save.folder}/${files[files.length - 1]}`, JSON.stringify({length: maxMessagesPerFile, messages: sliceArr}, null, 2));
                    lastFileObj.length = maxMessagesPerFile;
                } else {
                    console.log(`+---------------- Write to new file ----------------+`);
                    writeToFile({length: maxMessagesPerFile, messages: sliceArr}, false);
                }

                totalMessagesSaved += maxMessagesPerFile;

                if(result.length - maxMessagesPerFile > 0) {
                    result.messages = result.messages.slice(maxMessagesPerFile, maxMessagesPerFile + result.length);
                    result.length   = result.length - maxMessagesPerFile;
                } else {
                    result.messages = [];
                    result.length   = 0;
                }
            }

            let getMessagesOptions    = {limit: messagesToFetch, totalMessages: channelMessages};
            if(before != null)
                getMessagesOptions.before = before;
                

            messagesChunk = await getMessages(channel, getMessagesOptions);

            result.length   += messagesChunk.length;
            channelMessages += messagesChunk.length;
            before           = messagesChunk.before;
            total           -= messagesChunk.length;

            messagesChunk.messages.forEach((message) => {
                result.messages.push(message);
            })

            //No more messages to fetch
            if(messagesChunk.length < messagesToFetch) {
                break;
            } else {

            }
        }
        let ignoreLine = false;
        if(result.length > 0) {
            if(lastFileObj && lastFileObj.length < SETTINGS.getSettings().messages.maxMessagesPerFile) {
                console.log(`+--------------- Append to last file ---------------+`);
                write(`${SETTINGS.getSettings().messages.save.folder}/${files[files.length - 1]}`, result);
            } else {
                console.log(`+---------------- Write to new file ----------------+`);
                writeToFile(result, false);
            }

            ignoreLine = true;

            totalMessagesSaved += result.length;

            result.length = 0;
            result.messages = [];

        } else {
            console.log(`+---------------------------------------------------+`);
        }
        console.log(`| Messages fetched and saved: ${channelMessages}`.padding(51) + ` |`);
        console.log(`+---------------------------------------------------+`);
        console.log();
        /*
        //Debug setting code, duplicates total messages by multiplier
        const multiplier = SETTINGS.getSettings().messages.debugMessageMultiplier;
        for(let j = 0; j < multiplier; j++) {
            messagesChunk.messages.forEach((message) => {
                result.length = result.messages.push(message);
            })
        }
        */
    };
    console.log("*******************************************************************************************"); 
    console.log();

    return {totalMessagesSaved: totalMessagesSaved};
};

/**
 * Get messages from channel
 * 
 * @param {TextChannel} channel Channel to fetch messages from
 * @param {Object} limit limit of messages to fetch (Can't fetch more than x messages)
 * @returns {Promise<Object[]>} Array of parsed messages
 */
async function getMessages(channel, options) {
    let result          = [];
    let maxMessages     = SETTINGS.getSettings().messages.maxMessagesPerDiscordFetch;
    let fetchedMessages = 0;
    let before          = null;

    if(!options.before)
        options = {limit: options.limit, totalMessages: options.totalMessages};

    if (options.limit <= maxMessages) { //One fetch
        const messages = Array.from((await channel.messages.fetch({limit: options.limit})).values());
        result = result.concat(messages);    
    } else { //Multiple fetches
        let rounds      = (options.limit / 100) + (options.limit % 100 ? 1 : 0);
        options.limit   = maxMessages;

        for (let x = 0; x < rounds; x++) {
            const messages   = Array.from((await channel.messages.fetch(options)).values());
            fetchedMessages += messages.length;
            
            messages.forEach((message) => {
                result.push(message);
            });

            let fetchedMessagesLog = maxMessages;
            if(messages.length < maxMessages) 
                fetchedMessagesLog = messages.length;

            if((Math.floor(((options.totalMessages + fetchedMessages) / 100))) % SETTINGS.getSettings().messages.fetchesToLog == 0) {
                console.log(`| Total Messages Fetched: ${options.totalMessages + fetchedMessages}`.padding(51) + ` |`);
            }
                
            if(messages.length > 1)
                before = messages[messages.length - 1].id; //ID element of the last message
            options.before = before;
            await SETTINGS.sleep(1000); // Sleep for 1 second per fetch so Discord API doesn't possible rate limit

            if(messages.length < 100) 
                break;
        };
    };  

    return {length: result.length, messages: result, before: before};
};

/**
 * Parse messages using whitelist/blacklist of author/type/interval
 * 
 * @param {Object[]} messages Array of unparsed messages
 * @returns {Object[]} Array of parsed messages
 */
function parseMessages(messages) {
    let result = [];
    
    SETTINGS.refreshSettings();

    const whitelistObj = SETTINGS.getSettings().userInput.whitelist;
    const blacklistObj = SETTINGS.getSettings().userInput.blacklist;

    let temp = 0;

    messages.forEach((message) => {
        let channelWhitelist  = false;
        let authorWhitelist   = false;
        let typeWhitelist     = false;
        let intervalWhitelist = false;
        
        let channelBlacklist  = false;
        let authorBlacklist   = false;
        let typeBlacklist     = false;
        let intervalBlacklist = false;

        //console.log(` - Word createdTimestamp: ${(new Date(message.createdTimestamp)).toISOString()}`);
        message.content = message.content.toLowerCase();

        /* Whitelists */
        //Channels
        if(whitelistObj.channels.length > 0) {
            if(whitelistObj.channels.includes(message.channelId)) {
                channelWhitelist = true;
                //console.log(message.channelId + " INCLUDED");
            }
        } else {
            channelWhitelist = true;
        }

        //AuthorsId
        if(whitelistObj.messages.authorsId.length > 0) {
            if(whitelistObj.messages.authorsId.includes(message.authorId)) 
                authorWhitelist = true;
            
        } else {
            authorWhitelist = true;
        }

        //Type
        if(whitelistObj.messages.types.length > 0) {
            if(whitelistObj.messages.types.includes(message.type))
                typeWhitelist = true;
        } else {
            typeWhitelist = true;
        }

        //Interval
        //console.log("OBJ: ");
        //console.log(whitelistObj.messages.intervals[0].startDate);
        //console.log(message.createdTimestamp);
        //console.log(whitelistObj.messages.intervals[0].endDate);
        //console.log("whitelist interval (" + temp + "): " + `${(new Date(whitelistObj.messages.intervals[0].startDate)).toISOString()} <= (${(new Date(message.createdTimestamp)).toISOString()}) <= ${(new Date(whitelistObj.messages.intervals[0].endDate)).toISOString()}`);
        if(whitelistObj.messages.intervals.length > 0) {
            if(whitelistObj.messages.intervals.some(interval => interval.startDate <= message.createdTimestamp && message.createdTimestamp <= interval.endDate)) {
                temp++;
                intervalWhitelist = true;
            }
        } else {
            //console.log("Passes the whielist interval BAAAAADDDDDD: " + `${(new Date(whitelistObj.messages.intervals[0].startDate)).toISOString()} <= (${(new Date(message.createdTimestamp)).toISOString()}) <= ${(new Date(whitelistObj.messages.intervals[0].endDate)).toISOString()}`);
                
            intervalWhitelist = true;
        }
        
        /* Blacklists */

        //Channels
        if(blacklistObj.channels.length > 0) {
            if(blacklistObj.channels.includes(message.channelId)) 
                channelBlacklist = true;
        }

        //AuthorsId
        if(blacklistObj.messages.authorsId.length > 0) {
            if(blacklistObj.messages.authorsId.includes(message.authorId))
                authorBlacklist = true;
        }

        //Type
        if(blacklistObj.messages.types.length > 0) {
            if(blacklistObj.messages.types.includes(message.type))
                typeBlacklist = true;
        } 

        //Interval
        if(blacklistObj.messages.intervals.length > 0) {
            if(blacklistObj.messages.intervals.some(interval => interval.startDate <= message.createdTimestamp && message.createdTimestamp <= interval.endDate))
                intervalBlacklist = true;
        }

        //Push channel to result if it covers the above conditions 
        if((channelWhitelist && authorWhitelist && typeWhitelist && intervalWhitelist) && !(channelBlacklist && authorBlacklist && typeBlacklist && intervalBlacklist)) {
            result.push(parseMessageJson(message));
        } else {
            //console.log(`Reject ${message.createdTimestamp}`);
        }
    });
    return result;
};


/* --------------- */
/*      Words      */
/* --------------- */


/**
 * Save word frequencies using messages from local files
 * 
 * @returns {Number} Number of word frequencies
 */
function saveWordFreqFromLocalFiles() {
    SETTINGS.refreshSettings();

    const wordFreqFilePath   = SETTINGS.getFilePath(SETTINGS.getSettings().words.save);    
    const messagesFolderPath = `${SETTINGS.getSettings().messages.save.folder}`;
    let totalWords = 0;

    let result = {};let fileFreq = read(wordFreqFilePath);
    if(fileFreq)
        fs.unlinkSync(wordFreqFilePath);

    let messagesFiles = fs.readdirSync(`${messagesFolderPath}/`);
    messagesFiles.sort();

    for(let fileCount = 0; fileCount < messagesFiles.length; fileCount++) {
        let file = read(`${messagesFolderPath}/${messagesFiles[fileCount]}`);

        let messages = [];

        if(file) 
            messages = parseMessages((JSON.parse(file, null, 2)).messages);

        //word freq count
        result = convertToWordFrequency(messages, result).result;
    }
    totalWords = saveWordFreq(result);
    return totalWords;
}

/**
 * Save word frequencies using unsorted word frequency object
 * 
 * @param {Object} wordFreq Unsorted word frequency object
 * @returns {Number} Total frequency
 */
function saveWordFreq(wordFreq) {
    let result = {};

    const filePath = SETTINGS.getFilePath(SETTINGS.getSettings().words.save);
    const file     = read(filePath);

    if(!file) {
        result  = wordFreq;
    } else {
        result  = JSON.parse(file, null, 2);
        
        Object.keys(wordFreq).forEach((word) => {
            if(result[word]) { //old word
                result[word].frequency  += wordFreq[word].frequency;
                result[word].lastMessage = wordFreq[word].lastMessage;
            } else { //new word
                result[word] = wordFreq[word];
            }
        });
    }

    write(filePath, JSON.stringify(result, null, 2));

    return Object.keys(result).length;
};

/**
 * Convert array of messages to array of parsed words
 * 
 * @param {Object[]} messages Messages to convert
 * @returns {Object[]} Parsed words
 * @returns {Object[]} Resulting words
 */
function convertToWordFrequency(messages, result) {
    let words;
    let totalWords = 0;
    
    messages.forEach((msg) => {
        words = getWords(msg);
        const parsedWordsRes = parseWords(result, words, msg);

        result = parsedWordsRes.words;
        totalWords = parsedWordsRes.total;
    });

    return {result: result, totalWords: totalWords};
};

/**
 * Sort word frequency object (Descending order)
 * 
 * @param {Object} words Messages to convert
 * @returns {Object[]} Sorted words (Descending order)
 */
function sortWordFrequency(words) {
    let sortable    = [];
    let length      = 0;

    if(words) {
        Object.keys(words).forEach((word) => {
            sortable.push({word: word, data: words[word]});
            length++;
        });

        sortable.sort(function(a, b) {
            return a.data.frequency - b.data.frequency;
        });
    }

    //console.log("Custom words length: " + length);
    printToTerminal({length: length, words: sortable});

    return {result: {length: length, words: sortable}};
};


/**
 * Parse words and increases the frequency of the word in out
 * 
 * @param {Object} out word frequency object to append parsed words to
 * @param {Object} words Words to parse
 * @param {Object} message Message which the words come from
 * @returns {Object} Parsed words
 */
function parseWords(out, words, message) {
    let whitelist = false;
    let blacklist = false;

    let totalWords = 0;

    if(!out)
        out = {};

    SETTINGS.refreshSettings();

    const whitelistObj = {
        length: SETTINGS.getSettings().userInput.whitelist.messages.words.length,
        words: SETTINGS.getSettings().userInput.whitelist.messages.words
    };

    const blacklistObj = {
        length: SETTINGS.getSettings().userInput.blacklist.messages.words.length,
        words: SETTINGS.getSettings().userInput.blacklist.messages.words
    };

    words.forEach((word) => {
        if(word.length > 1) {
                
            //If whitelisted word
            if(whitelistObj.words.length > 0) {
                if(whitelistObj.words.some(whiteListWord => whiteListWord.toLowerCase() == word.toLowerCase()))
                    whitelist = true;
            } else {
                whitelist = true;
            }
            
            //If blacklisted word
            if(blacklistObj.words.length > 0) {
                if(blacklistObj.words.some(blackListWord => blackListWord.toLowerCase() == word.toLowerCase()))
                    blacklist = true;
            }
    
            //If whitelisted & not blacklisted
            if(whitelist && !blacklist) {
                message.createdTimestamp = (new Date(message.createdTimestamp)).toISOString();
                if(out[word] != null) {
                    out[word].frequency++;
                    out[word].lastMessage = message;
                } else {
                    out[word] = {
                        frequency: 1,
                        lastMessage: message
                    };
                    totalWords++;
                }
            }   
    
            whitelist = false;
            blacklist = false;
        }
    })
    
    return {words: out, total: totalWords};
}

/**
 * Get words
 * 
 * @param {Object} message Message to extract words from
 * @returns {Object} Parsed words
 */
function getWords(message) {
    let result = [];
    const re = new RegExp(SETTINGS.getSettings().words.regex);
    if(message.content.length > 1) {
        result = message.content.split(re);
    }
    return result;
}


/* -------------------- */
/*      Save/Write      */
/* -------------------- */

/**
 * Get words
 * 
 * @param {Object} result Messages to write to file
 * @param {Object} freshFiles delete all files in folder if true, if not false it will create a new file correctly
 */
function writeToFile(result, freshFiles) {
    const date              = new Date();
    const fileNameDate      = SETTINGS.getDateFileString(date);
    const folderPath        = `${SETTINGS.getSettings().messages.save.folder}`;
    const filePathPre       = `${folderPath}/${SETTINGS.getSettings().messages.save.name}_${fileNameDate}`;
    const messagesPerFile   = SETTINGS.getSettings().messages.maxMessagesPerFile;
    
    let files = fs.readdirSync(`${folderPath}/`);
    files.sort();

    if(freshFiles && files) {
        deleteSavedMessagesFiles();
    };

    let i = 0;
    let filesWritten = 0;
    
    if(!freshFiles && files)
        i = files.length; //New file, doesn't matter how few or many messages in the latest file

    let remainingMessages = result.length;
    while(remainingMessages > 0) {
        let length = messagesPerFile;
        if(remainingMessages - messagesPerFile < 0)
            length = remainingMessages;

        const messageChunk = result.messages.slice(filesWritten * messagesPerFile, (filesWritten * messagesPerFile) + length);
        filesWritten++;

        let object = {
            length: messageChunk.length,
            messages: messageChunk
        };

        //MAX 100_000 * 1_000_000 messages per file = 100_000_000_000 total messages
        //MAX 100_000 * 1_000     messages per file = 100_000_000     total messages
        const number = ("0000" + i).slice (-5); 
        const filePath = `${filePathPre}_${number}.${SETTINGS.getSettings().messages.save.fileType}`;
        if(!write(filePath, JSON.stringify(object, null, 2)))
            console.error(`Manual Error: writeToFile(result, freshFiles) failed to write - Path: ${filePath}`);
        
        remainingMessages -= length;
        i++; //Next file
    }
};

/**
 * Delete all saved message files
 * 
 */
function deleteSavedMessagesFiles() {
    const folderPath = `${SETTINGS.getSettings().messages.save.folder}`;
    let files        = fs.readdirSync(`${folderPath}/`);

    if(files) {
        files.forEach((file) => {
            fs.unlinkSync(`${folderPath}/${file}`);
        })
    };
    console.log(`+-----------------------+`);
    console.log(`| Deleted message files |`);
    console.log(`+-----------------------+`);
    console.log(`| ${files.length}`.padding(24) + `|`);
    console.log(`+-----------------------+`);
    console.log();
    console.log("*******************************************************************************************");
}


/* --------------- */
/*       Etc       */
/* --------------- */

/**
 * Not used
 * 
 */
async function printToTerminal(words) {
    const paddings = SETTINGS.getSettings().terminal.paddings;

    let header = "";
    for(let i = 0; i < paddings.length; i++) {
        header += '-'.repeat(paddings[i]);
        if(i != paddings.length - 1)
            header += '-+-';
    }

    const paddingNames = SETTINGS.getSettings().terminal.names;

    console.log(`${paddingNames[0].padding(paddings[0])} | ${paddingNames[1].padding(paddings[1])} | ${paddingNames[2].padding(paddings[2])} | ${paddingNames[3].padding(paddings[3])} | ${paddingNames[4].padding(paddings[4])} | ${paddingNames[5].padding(paddings[5])}`);
    console.log(header);

    let printed = 0;
    for(let i = words.length - 1; i >= 0; i--) {
        let word = words.words[i];
        if(word.data.frequency > 0 && printed < SETTINGS.getSettings().terminal.top) {
            printed++;
            console.log(`${printed.toString().padding(paddings[0])} | ${word.word.toString().padding(paddings[1])} | ${word.data.frequency.toString().padding(paddings[2])} | ${word.data.lastMessage.channelId.toString().padding(paddings[3])} | ${(new Date(word.data.lastMessage.createdTimestamp)).toISOString().padding(paddings[4])} | ${word.data.lastMessage.id.toString().padding(paddings[5])}`);
        }
    }
};

// Pads a string with white spaces to be n characters long
String.prototype.padding = function(n)
{       const c = ' ';
        var val = this.valueOf();
        if ( Math.abs(n) <= val.length ) {
                return val;
        }
        var m = Math.max((Math.abs(n) - this.length) || 0, 0);
        var pad = Array(m + 1).join(String(c || ' ').charAt(0));
        return (n < 0) ? pad + val : val + pad;
};

module.exports = {
	data: new SlashCommandBuilder()
	  	.setName("savemessages")
	  	.setDescription("Save Messages"),
	async execute(interaction) {
        await interaction.deferReply().then(async () => {
            const result = await saveMessages(interaction);
            console.log();
            await interaction.followUp("RESULT: (" + result.quantity + ") message(s) fetched in (" + result.runtime + ") seconds");
        }).catch(err => {console.error(err)});
	},
    saveMessages,               //Fetch messages from discord API, and save them in folder
    getChannels,                //Fetch channels that is in whitelist and not in blacklist
    saveWordFreqFromLocalFiles, //Save word frequencies from local messages files (words are parsed)
    sortWordFrequency,          //Sort word frequencies
    deleteSavedMessagesFiles,   //Delete all saved messages
    printToTerminal             //Print word frequencies to the terminal
};