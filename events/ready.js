const { saveWordFreqFromLocalFiles, sortWordFrequency } = require('../commands/saveMessages.js');
const { update } = require('../commands/methods/sheet.js');

const SETTINGS = require('../commands/methods/misc.js')

const updateInterval  = 3;   //seconds
const consoleInterval = 1;    //seconds
let lastUpdate 		  = 0;    //seconds

async function updateOnLoop() {
	setTimeout(async function run() {
		console.log(`Seconds since update: ${(lastUpdate += consoleInterval)}s`); 
		if(lastUpdate == updateInterval) {
			//update(saveWordFreqFromLocalFiles, sortWordFrequency);
			console.log("Updating...!");
			const startTime = Date.now();
			
			await update(saveWordFreqFromLocalFiles, sortWordFrequency);

			console.log("Updated! Time: " + SETTINGS.calculateTimeDifference(startTime, Date.now()) + "s");
			lastUpdate = 0;
		}
		setTimeout(async () => {
			await run();
		}, consoleInterval * 1_000);
	}, consoleInterval * 1_000);
}

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {
		//Bot is initializing
		console.log(`Initializing!`);

		//updateOnLoop();

		//Bot is ready to use
		console.log(`Ready! Logged in as ${client.user.tag}`);
	}
};