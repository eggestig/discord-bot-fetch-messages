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

function getDateFileString(date) {
    let year    = date.getFullYear();
    let month   = date.getMonth() + 1;
    let day     = date.getDate();
    let hour    = date.getHours();
    let minute  = date.getMinutes();
    let second  = date.getSeconds();

    if(`${month}`.length < 2)
        month = `0${month}`;

    if(`${day}`.length < 2)
        day = `0${day}`;

    if(`${hour}`.length < 2)
        hour = `0${hour}`;

    if(`${minute}`.length < 2)
        minute = `0${minute}`;

    if(`${second}`.length < 2)
        second = `0${second}`;

    return `${year}_${month}_${day}_${hour}_${minute}_${second}`;

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
    calculateTimeDifference,
    getDateFileString
}
