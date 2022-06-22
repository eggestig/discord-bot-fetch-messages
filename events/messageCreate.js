const fs            = require('fs');
const sheet         = require('../commands/methods/sheet.js');
const msgHandler    = require('../commands/methods/messageHandler.js');
const {read, write} = require('../commands/methods/fileHandler.js');
const SETTINGS      = require("../commands/methods/misc.js");

/**
 * Handle a message String by saving it to a buffer file, and appending buffer to message files if buffer is full
 * 
 * @param {String} messages Message to handle
*/
function handleMessage(message) {
    if(!msgHandler.initiateBuffer())
        return console.error(`Couldn't initiate buffer -> Message not handled. ID: ${message.id}`);

    msgHandler.pushMessage(sheet.parseMessageJson(message));

    if(msgHandler.getBuffer().size % SETTINGS.getSettings().buffer.messagesToLog == 0)
        console.log(`Buffer size (${msgHandler.getBuffer().size}/${SETTINGS.getSettings().buffer.size})`);

    if(msgHandler.isBufferFull()) {
        console.log(`Buffer full (${msgHandler.getBuffer().size}/${SETTINGS.getSettings().buffer.size}) | Append buffer to messages files`);
        sendBuffer();
        console.log(`Buffer size (${msgHandler.getBuffer().size}/${SETTINGS.getSettings().buffer.size})`);
    }
}

/**
 * Append current saved buffer file to message files
 * 
*/
function sendBuffer() {
    const date = new Date();

    const buffer = msgHandler.getBuffer(); 
    msgHandler.emptyBuffer();

    let files = fs.readdirSync(`${SETTINGS.getSettings().messages.save.folder}`);
    if(files) files.sort();

    buffer.messages.forEach((message) => {
        let toWrite = null;
        files.forEach((file) => {
            if(toWrite == null && file == `${SETTINGS.getDateFileString(new Date(message.createdTimestamp))}.${SETTINGS.getSettings().messages.save.fileType}`) {
                toWrite = JSON.parse(read(`${SETTINGS.getSettings().messages.save.folder}/${file}`), null, 2);
                toWrite.length++;
                toWrite.messages.push(message);  
            }
        });
        if(!toWrite) {
            toWrite = {length: 1, messages: [message]};
        }
        write(`${SETTINGS.getSettings().messages.save.folder}/${SETTINGS.getDateFileString(new Date(message.createdTimestamp))}.${SETTINGS.getSettings().messages.save.fileType}`, JSON.stringify(toWrite, null, 2));
    });
}

module.exports = {
	name: 'messageCreate',
	execute(message) {      
        handleMessage(message);
    }
};