const { SlashCommandBuilder }                           = require('@discordjs/builders');
const { CommandInteraction, TextChannel, Permissions }  = require('discord.js');
const fs                                                = require('fs');

/* Local */
const { write, read }               = require('./methods/fileHandler.js');
const {update, parseMessageJson }   = require('./methods/sheet.js');
const SETTINGS                      = require('./methods/misc.js');
const { channel } = require('diagnostics_channel');


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
            && channel.type == "GUILD_TEXT") {
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
    const msDate = interaction.options.getInteger("ms");

    let tempDate;
    if(interaction.options.getInteger("ms")) {
        tempDate = new Date(msDate);
    } else {
        tempDate = new Date();
        tempDate.setFullYear(1999, 0, 1); //Default (will get all messages)
    }
    
    // Ignore h/m/s/ms of the date
    tempDate.setHours(0, 0, 0, 0);

    //Fetch channels
    console.log();
    console.log(`Fetching channels...`);
    const channelRes = await getChannels(interaction);
    //Delete saved messages
    console.log();
    console.log(`Deleting... From: ${tempDate.toDateString()} - ${(new Date()).toDateString()}`);
    deleteSavedMessagesFiles(tempDate.getTime());
    
    //Fetch messages
    console.log();
    console.log(`Fetch and save messages... From: ${tempDate.toDateString()} - ${(new Date()).toDateString()}`);

    const savedMessagesRes = await saveMessagesHelper(channelRes.result.channels, tempDate.getTime());
    //console.log(`Total messages saved: ${savedMessagesRes.totalMessagesSaved}`);

    //Update spreadsheet
    console.log();
    console.log(`Updating spreadsheet...`);
    await update(saveWordFreqFromLocalFiles, sortWordFrequency, saveWordInfoFromLocalFiles, interaction);
    console.log(`Spreadsheet updated`);

    //Total time
    const total = SETTINGS.calculateTimeDifference(startTime, Date.now());

    //Logs
    console.log();
    console.log(`${"Total time for /save".padding(30)} | ${total}s | ${savedMessagesRes.totalMessagesSaved}`);

    return {quantity: savedMessagesRes.totalMessagesSaved, runtime: total};
};

/**
 * Get messages helper function
 * 
 * @param {TextChannel[]} channels Channels to fetch messages from
 * @param {number} dateMs Up to this unix date in ms to fetch
 * @returns {Promise} Array of parsed messages
 */
async function saveMessagesHelper(channels, dateMs) {
    let totalMessagesSaved   = 0;
    const maxMessagesPerFile = SETTINGS.getSettings().messages.maxMessagesPerFile;
    let messagesChunk        = null;
    let messagesToFetch      = 0;
    const filePre = `${SETTINGS.getSettings().messages.save.folder}`;
    const startTime = Date.now();
    
    //let getMessagesOptions    = {limit: maxMessagesPerFile, totalMessages: 0};

    for(let i = 0; i < channels.length; i++) {
        const channel       = channels[i];
        let before          = null;
        let channelMessages = 0;
        let options         = {};

        const initialDate = new Date();
        initialDate.setHours(0, 0, 0, 0); // Ignore h/m/s/ms
        
        console.log(`+---------------------------------------------------+`);
        console.log(`| Fetching Messages: `+ `${channel.name}`.padding(30) +` |`);
        console.log(`+---------------------------------------------------+`);

        options.dateMs = dateMs;
        options.dateMsCurrent = initialDate.getTime();

        while(options.dateMs <= options.dateMsCurrent) {
        
            console.log(`|                    [${SETTINGS.getDateFileString(new Date(options.dateMsCurrent))}]                   |`);
            console.log(`|                                                   |`);
            
            if(before != null) options.before = before;
                
            messagesChunk = await getMessages(channel, options);

            channelMessages += messagesChunk.length;

            
            //Save
            if(messagesChunk.length > 0) {
                let result = {};
                totalMessagesSaved += messagesChunk.length;
                let file = read(`${filePre}/${SETTINGS.getDateFileString(new Date(options.dateMsCurrent))}.${SETTINGS.getSettings().messages.save.fileType}`);
                if(file) {
                    console.log(`+--------------- Append to last file ---------------+`);
                    
                    let fileObj = JSON.parse(file, null, 2);
                    fileObj.length += messagesChunk.length;
                    messagesChunk.messages.forEach((message) => {
                        fileObj.messages.push(message);
                    });

                    result = fileObj;                    
                } else {
                    result = { length: messagesChunk.length, messages: messagesChunk.messages };
                    console.log(`+---------------- Write to new file ----------------+`);
                }
                write(`${filePre}/${SETTINGS.getDateFileString(new Date(options.dateMsCurrent + (86000 * 1000)))}.${SETTINGS.getSettings().messages.save.fileType}`, JSON.stringify(result, null, 2));
            }
            //Checks if there are more messages to check
            if(!messagesChunk.moreMessages)
                break;

            options.dateMsCurrent = messagesChunk.dateMsCurrent;
        }
        console.log(`+---------------------------------------------------+`);
        console.log(`| Messages fetched and saved: ${channelMessages}`.padding(51) + ` |`);
        console.log(`+---------------------------------------------------+`);
        console.log();

            
        console.log("+----------------------------------------------------+");
        console.log(`| Current Date                                       |`);
        console.log(`| ${(new Date()).toTimeString()}`.padding(52) + ` |`);
        console.log(`|                                                    |`);
        console.log(`| Command Runtime                                    |`);
        console.log(`| ${(Date.now() - startTime) / 1000.0} seconds`.padding(52) + ` |`);
        console.log(`|                                                    |`);
        console.log(`| Channels progression                               |`);
        console.log(`| ${i}/${channels.length}`.padding(52) + ` |`);
        console.log("+----------------------------------------------------+");
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
    let before          = null;
    let moreMessages    = true;

    let afterBeforeDate = null;

    options.limit   = maxMessages;

    let totalMsgs = 0;

    let fetch = true;
    while(fetch) {
        let messagesLength = 0;
        const messages   = Array.from((await channel.messages.fetch(options)).values());
        let skippedMsg = false;
        

        messages.forEach((message) => {
            if(options.dateMsCurrent <= message.createdTimestamp) {
                result.push(message);
                before = message.id;
                messagesLength++
                totalMsgs++;
            } else {
                if(!skippedMsg) {
                    let tempDate = new Date(message.createdTimestamp);
                    tempDate.setHours(0, 0, 0, 0);
                    afterBeforeDate = tempDate.getTime();
                    skippedMsg = true;
                }
                fetch = false;
            }
        });

        if((Math.floor(((options.totalMessages + messagesLength) / 100))) % SETTINGS.getSettings().messages.fetchesToLog == 0 || !fetch) {
            console.log(`| Total Messages Fetched: ${totalMsgs}`.padding(51) + ` |`);
        }

        await SETTINGS.sleep(1000); // Sleep for up to 1 second per fetch so Discord API doesn't possible rate limit
        
        if(messages.length == 0) {
            moreMessages = false; 
            fetch        = false;
        }

        options.before = before;
    };

    if(afterBeforeDate == null)
        afterBeforeDate = options.dateMsCurrent - (86400 * 1000); // Previous day date

    return {length: result.length, messages: result, before: before, moreMessages: moreMessages, dateMsCurrent: afterBeforeDate};
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
 * Save message info of words
 * 
 * @returns {Number} Number of word frequencies
 */
function saveWordInfoFromLocalFiles(interaction) {
    SETTINGS.refreshSettings();

    const wordFreqFilePath   = SETTINGS.getFilePath(SETTINGS.getSettings().words.save);    
    const messagesFolderPath = `${SETTINGS.getSettings().messages.save.folder}`;
    let totalWords           = 0;
    let totalMessages        = 0;

    let result = {};
    let fileFreq = read(wordFreqFilePath);
    if(!fileFreq)
        return null;

    let words = JSON.parse(fileFreq, null, 2);

    console.log("Words to save info about");
    console.log(Object.keys(words));


    let messagesFiles = fs.readdirSync(`${messagesFolderPath}/`);
    messagesFiles.sort();
    Object.keys(words).forEach((word) => {
        words[word].info = {
            users: {},
            channels: {
						},
            dates: {
							days: {}
            }
        };
    });

		let startDate = new Date(SETTINGS.getSettings().userInput.whitelist.messages.intervals[0].startDate); //Only takes into account the first starting interval
		let endDate   = new Date(SETTINGS.getSettings().userInput.whitelist.messages.intervals[0].endDate);   //Same here (if any)
		if(endDate.getTime() == SETTINGS.getSettings().endDateDefault)
			endDate = new Date();
		let dateTemp = new Date();
		dateTemp.setTime(0);
		dateTemp.setFullYear(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

		while(dateTemp.getTime() < endDate.getTime()) {
			Object.keys(words).forEach((word) => {
        words[word].info.dates.days[dateTemp.toISOString()] = 0
			});
			dateTemp.setTime(dateTemp.getTime() + 86400000);
		}
		
    
    for(let fileCount = 0; fileCount < messagesFiles.length; fileCount++) {
        let file = read(`${messagesFolderPath}/${messagesFiles[fileCount]}`);
        console.log(`${messagesFolderPath}/${messagesFiles[fileCount]}`);
        

        let messages = [];

        if(file) 
					messages = parseMessages((JSON.parse(file, null, 2)).messages);

				let ttt = 0;
				let startTime = new Date();
				let time = startTime;
        messages.forEach((message) => {
					if(ttt++ % 100 == 0) {
						let timeDiff  = (new Date(Date.now() - time.getTime())).getTime() / 1000.0
						let timeDiff2 = (new Date(Date.now() - startTime.getTime())).getTime() / 1000.0
						console.log(ttt + "/" + messages.length + " | current: " + timeDiff + "s | total: " + (timeDiff2 / 60.0) + "min");
						time = new Date();
					}

					let wordsInMessage = getWords(message);
					wordsInMessage.forEach((wordInMessage) => {
							Object.keys(words).forEach((word) => {
									if(word == wordInMessage) {
											//users
											if(words[word].info.users[message.authorId] != null) {
													words[word].info.users[message.authorId]++;
											} else {
													words[word].info.users[message.authorId] = 1;
											}

											//channels
											if(words[word].info.channels[message.channelId] != null) {
													words[word].info.channels[message.channelId].freq++;
											} else {
													words[word].info.channels[message.channelId] = {name: interaction.guild.channels.cache.find(channel => channel.id == message.channelId).name, freq: 1}
											}

											//dates (just days for now)
											let messageDate = new Date(message.createdTimestamp);
											let date = new Date();
											date.setTime(0);
											date.setFullYear(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
											words[word].info.dates.days[date.toISOString()]++;
									}
							});
					});
        });
				
    }
		
		console.log("6");

    //Parse users

    Object.keys(words).forEach((word) => {
        wordFreq = {
            "1": {
                start: 1,
                end: 1,
                freq: 0
            },
            "2": {
                start: 2,
                end: 4,
                freq: 0
            },
            "3-4": {
                start: 3,
                end: 4,
                freq: 0
            },
            "5-9": {
                start: 5,
                end: 9,
                freq: 0
            },
            "10-24": {
                start: 10,
                end: 24,
                freq: 0
            },
            "25+": {
                start: 25,
                end: 9_999_999,
                freq: 0
            }
        };

        Object.values(words[word].info.users).forEach((userFreq) => {
            Object.keys(wordFreq).forEach((interval) => {
                if(wordFreq[interval].start <= userFreq && userFreq <= wordFreq[interval].end)
                    wordFreq[interval].freq++;
            });
        });
        words[word].info.users = wordFreq;
    });

    console.log("land:");
    console.log(words["land"].info);

    console.log("sale:");
    console.log(words["sale"].info);
    
    console.log("land:");
    console.log("  users:    " + Object.keys(words["land"].info.users).length);
    console.log("  channels: " + Object.keys(words["land"].info.channels).length);
    console.log("  days:     " + Object.keys(words["land"].info.dates.days).length);

    console.log("sale:");
    console.log("  users:    " + Object.keys(words["sale"].info.users).length);
    console.log("  channels: " + Object.keys(words["sale"].info.channels).length);
    console.log("  days:     " + Object.keys(words["sale"].info.dates.days).length);

    return {wordInfo: words, totalWords: totalWords, totalMessages: totalMessages};
}


/**
 * Save word frequencies using messages from local files
 * 
 * @returns {Number} Number of word frequencies
 */
function saveWordFreqFromLocalFiles() {
    SETTINGS.refreshSettings();

    const wordFreqFilePath   = SETTINGS.getFilePath(SETTINGS.getSettings().words.save);    
    const messagesFolderPath = `${SETTINGS.getSettings().messages.save.folder}`;
    let totalWords           = 0;
    let totalMessages        = 0;

    let result = {};
    let subResult = {};
    let fileFreq = read(wordFreqFilePath);
    if(fileFreq)
        fs.unlinkSync(wordFreqFilePath);

    let messagesFiles = fs.readdirSync(`${messagesFolderPath}/`);
    messagesFiles.sort();

    let startTime         = Date.now();
    let tempTotalMessages = 0;
    let tempTotalWords    = 0;


    for(let fileCount = 0; fileCount < messagesFiles.length; fileCount++) {
        let file = read(`${messagesFolderPath}/${messagesFiles[fileCount]}`);

        let messages = [];

        if(file) 
            messages = parseMessages((JSON.parse(file, null, 2)).messages);

        //word freq count
        const wordFreq = convertToWordFrequency(messages, subResult);
        subResult      = wordFreq.result;
        totalWords    += wordFreq.totalWords;
        totalMessages += wordFreq.totalMessages;

        tempTotalMessages += wordFreq.totalMessages;
        tempTotalWords    += wordFreq.totalWords;

        if(fileCount % 50 == 0 || (fileCount == messagesFiles.length - 1)) {
            console.log(`| files counted: ${fileCount}/${messagesFiles.length}`.padding(27) + ` |`);
            startTime         = Date.now();
            tempTotalMessages = 0;
            tempTotalWords    = 0;
        }
            
        if(fileCount % 1 == 0) {
            if(subResult != null) {
                Object.keys(subResult).forEach((word) => {
                    if(!result[word]) { 
                        result[word] = subResult[word];
                    } else {
                        result[word].frequency += subResult[word].frequency;
                        if(result[word].lastMessage.createdTimestamp < subResult[word].lastMessage.createdTimestamp)
                            result[word].lastMessage = subResult[word].lastMessage;
                    }
                })
            }
            subResult = {};
        

        }
    }

    const totalUniqueWords = saveWordFreq(result);
    console.log(`| Saving...`.padding(27) + ` |`);
    console.log(`+---------------------------+`);
    return {totalUniqueWords: totalUniqueWords, totalWords: totalWords, totalMessages: totalMessages};
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
    let totalMessages = 0;
    
    messages.forEach((msg) => {
        words = getWords(msg);  
        const parsedWordsRes = parseWords(result, words, msg);

        if(Object.keys(parsedWordsRes.words).length > 0)
            totalMessages++;

        result = parsedWordsRes.words;
        totalWords += parsedWordsRes.total;
    });

    return {result: result, totalWords: totalWords, totalMessages: totalMessages};
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
                message.content = message.content.replace(/\n/g, "[\\n]");
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
 * @param {Object} dateMs date in unix ms to append to file
 */
function writeToFile(result, dateMs) {
    const date              = new Date(dateMs);
    const fileNameDate      = SETTINGS.getDateFileString(date);
    const folderPath        = `${SETTINGS.getSettings().messages.save.folder}`;
    const filePath          = `${folderPath}/${SETTINGS.getSettings().messages.save.name}_${fileNameDate}.${SETTINGS.getSettings().messages.save.fileType}`;

    if(fs.existsSync(filePath)) {
        let file = JSON.parse(read(filePath), null, 2);
        result.length += file.length;
        result.messages.concat(file.messages);
    }

    
    if(!write(filePath, JSON.stringify(result, null, 2)))
        console.error(`Manual Error: writeToFile(result, dateMs) failed to write - Path: ${filePath}`);

};

/**
 * Delete all saved message files
 * 
 */
function deleteSavedMessagesFiles(dateMs) {
    const folderPath = `${SETTINGS.getSettings().messages.save.folder}`;
    let files        = fs.readdirSync(`${folderPath}/`);

    let deletedFiles = 0;
    files.sort();

    console.log(`+------------------------+`);
    console.log(`| Deleting message files |`);
    console.log(`+------------------------+`);

    if(files) {
        files.forEach((file) => {
            let currentMs = dateMs;
            while(currentMs < Date.now()) {
                if(file == `${SETTINGS.getDateFileString(new Date(currentMs))}.${SETTINGS.getSettings().messages.save.fileType}`) {
                    console.log(`| ${file}         |`);
                    fs.unlinkSync(`${folderPath}/${file}`);
                    deletedFiles++;
                }
                currentMs += 86400 * 1000; // Add 1 day
            }
        })
    };
    console.log(`+------------------------+`);
    console.log(`| Deleted message files  |`);
    console.log(`+------------------------+`);
    console.log(`| ${deletedFiles}`.padding(25) + `|`);
    console.log(`+------------------------+`);
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
		.setName("save")
		.setDescription("-")
		.addIntegerOption(option => 
			option.setName("ms")
				.setDescription("-")
				.setRequired(false)),
	async execute(interaction) {
		const startTime = Date.now(); 
		//Only Eggestig or BSS are authorized
		if (interaction.user.id == "137937860400513024" || interaction.member.roles.cache.has("491195420597420033")) {
			await interaction.deferReply().then(async () => {
				let reply = true;
				setTimeout(async () => {
					if(reply) {
						reply = false;
						const totalTime = SETTINGS.calculateTimeDifference(startTime, Date.now());
						await interaction.followUp("RESULT: Messages still being fetched after (" + totalTime + ") seconds...\nCheck terminal for updates");
					}
				}, 14 * 60 * 1000); // 14 minutes, after 15 minutes you cannot use followUp. Without using msg sending priviliges (to send a msg and then edit that one to update) I don't think it's possible to provide updates after that
				const result = await saveMessages(interaction);
				if(reply) {
					console.log();
					await interaction.followUp("RESULT: (" + result.quantity + ") message(s) fetched in (" + result.runtime + ") seconds");
					reply = false;
				}
			}).catch(err => {console.error(err)});
		} else {
			await interaction.reply("Not authorized");
		}
	},
	saveMessages,               //Fetch messages from discord API, and save them in folder
	getChannels,                //Fetch channels that is in whitelist and not in blacklist
	saveWordFreqFromLocalFiles, //Save word frequencies from local messages files (words are parsed)
	sortWordFrequency,          //Sort word frequencies
	printToTerminal,            //Print word frequencies to the terminal
	saveWordInfoFromLocalFiles  //Save word info from word local files
};