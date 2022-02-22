/* Local */
const {write, read} = require('./fileHandler.js');
const SETTINGS      = require('./misc.js');

/* Variables */
const bufferPath = `${SETTINGS.getSettings().buffer.save.folder}/${SETTINGS.getSettings().buffer.save.name}.${SETTINGS.getSettings().buffer.save.fileType}`;
const bufferSize = SETTINGS.getSettings().buffer.size; //Messages to buffer
let buffer       = null;

// Load client secrets from a local file.
function pushMessage(msg) {
    if(!buffer) return console.error("buffer not initiated");

    if(isBufferFull()) return console.error("buffer full");

    if(!msg) return console.error("No valid message: " + msg);

    buffer.messages.push(msg);
    buffer.size++;

    const data = JSON.stringify(buffer, null, 2);

    write(bufferPath, data);
};

function isBufferFull() {
    if(buffer) return buffer.size >= bufferSize;
    
    console.error("buffer not initiated.");
    return null;
};

function getEmptyBuffer() {
    return {
        size: 0,
        messages: []
    };
}

function emptyBuffer() {
    if(!buffer) return console.error("buffer not initiated");
    
    buffer = getEmptyBuffer();

    const data = JSON.stringify(buffer, null, 2);

    write(bufferPath, data);
};

function initiateBuffer() {
    let data = read(bufferPath);
    if(!data) {
        write(bufferPath, JSON.stringify(getEmptyBuffer(), null, 2));
        buffer = JSON.parse(read(bufferPath));
    } else {
        buffer = JSON.parse(data);
    }

    return buffer;
};

function getBuffer() {
    if (!buffer) initiateBuffer();

    return buffer;
};

module.exports = {
    pushMessage,
    isBufferFull,
    emptyBuffer,
    initiateBuffer,
    getBuffer
}