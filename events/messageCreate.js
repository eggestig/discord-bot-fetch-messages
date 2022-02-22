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

    const messages = msgHandler.getBuffer(); 
    msgHandler.emptyBuffer();

    let files = fs.readdirSync(`${SETTINGS.getSettings().messages.save.folder}`);
    let messagesFile = null;

    if(files && files.length > 0) {
        files.sort();
        messagesFile = JSON.parse(read(`${SETTINGS.getSettings().messages.save.folder}/${files[files.length - 1]}`), null, 2);
    }

    /* APPEND/WRITE/CREATE */
    const dateName    = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`;
    const filePathPre = `${SETTINGS.getSettings().messages.save.folder}/${SETTINGS.getSettings().messages.save.name}_${dateName}`;
    
    let initialLength = 0;
    let initialMessages = [];

    if(messagesFile) {
        initialLength  = messagesFile.length;
        initialMessages = messagesFile.messages;
    }

    let object = {
        length: initialLength + messages.size,
        messages: initialMessages.concat(messages.messages)
    };

    if(object.length > SETTINGS.getSettings().messages.maxMessagesPerFile || files.length == 0) {
        //MAX 100_000 * 1_000_000 messages per file = 100_000_000_000 total messages
        //MAX 100_000 * 1_000     messages per file = 100_000_000     total messages
        const number = ("0000" + files.length).slice(-5);
        write(`${filePathPre}_${number}.${SETTINGS.getSettings().messages.save.fileType}`, JSON.stringify(messages, null, 2));
    } else {
        write(`${SETTINGS.getSettings().messages.save.folder}/${files[files.length - 1]}`, JSON.stringify(object, null, 2));
    }
}

module.exports = {
	name: 'messageCreate',
	execute(message) {        
        handleMessage(message);
    }
};