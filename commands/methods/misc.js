/* Local */
const {read, write} = require('./fileHandler.js');

const SETTINGS_FOLDER_PATH = `settings`;
const SETTINGS_FILE_PATH   = `${SETTINGS_FOLDER_PATH}/settings.json`;
let SETTINGS               = null;

function getSettings() {
    if(!SETTINGS)
        refreshSettings();
    return SETTINGS
}

function refreshSettings() {
    SETTINGS = JSON.parse(read(SETTINGS_FILE_PATH), null, 2)
}

function updateSettings(newSettings) {
    write(SETTINGS_FILE_PATH, JSON.stringify(newSettings, null, 2));
    SETTINGS = newSettings;
}

function getFilePath(saveObj) {
    return `${saveObj.folder}/${saveObj.name}.${saveObj.fileType}`;
}

/**
 * Async sleep
 * 
 * @param {number} ms Milliseconds to sleep
 */
async function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

/**
 * Time difference in seconds
 * 
 * @param {number} startTimeMs startTime in UNIX milliseconds
 * @param {number} endTimeMs endTime in UNIX milliseconds
 * @returns {number} Time difference in seconds, with x decimals of precision
 */
function calculateTimeDifference(startTimeMs, endTimeMs) {
    return ((endTimeMs - startTimeMs)/getSettings().messages.millisecondsInSecond)
        .toFixed(getSettings().messages.floatPrecision);
}

module.exports = {
    getSettings,
    refreshSettings,
    updateSettings,
    getFilePath,
    sleep,
    calculateTimeDifference
}
