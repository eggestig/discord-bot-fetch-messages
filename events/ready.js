/* Local */
const { saveWordFreqFromLocalFiles, sortWordFrequency } = require('../commands/save.js');
const { update } 										= require('../commands/methods/sheet.js');
const SETTINGS 											= require('../commands/methods/misc.js')

const updateInterval  = SETTINGS.getSettings().timings.updateLoop.updateInterval;   //seconds
const consoleInterval = SETTINGS.getSettings().timings.updateLoop.consoleInterval;   //seconds
let lastUpdate 		  = 0;    //seconds

async function updateOnLoop() {
	setTimeout(async function run() {
		console.log(`Seconds since update: ${(lastUpdate += consoleInterval)}s`); 
		if(lastUpdate == updateInterval) {
			console.log();
			console.log("+---------------------------+");
			console.log(`|     Automatic Update!     |`);
			console.log(`| ${(new Date()).toISOString()}`.padding(27) + ` |`);
			console.log("+---------------------------+");
			const startTime = Date.now();
			
			await update(saveWordFreqFromLocalFiles, sortWordFrequency);

			console.log();
			console.log("+---------------------------+");
			console.log(`|     Automatic Update!     |`);
			console.log(`| Time: ${SETTINGS.calculateTimeDifference(startTime, Date.now())}s`.padding(27) + ` |`);
			console.log("+---------------------------+");
			lastUpdate = 0;
		}
		setTimeout(async () => {
			await run();
		}, consoleInterval * SETTINGS.getSettings().messages.millisecondsInSecond);
	}, consoleInterval * SETTINGS.getSettings().messages.millisecondsInSecond);
}

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
	name: 'ready',
	once: true,
	async execute(client) {
		//Bot is initializing
		console.log(`Initializing!`);

		// set the status (online/dnd/invisible/away) (needs to be run every time)
		client.user.setStatus("invisible")	

		// set the avatar pfp if needs changing (only needs to be run once)
		/*
		client.user.setAvatar('./saveFiles/avatar.jpeg')
			.then(user => console.log(`New avatar set!`))
			.catch(console.error);
		*/

		//updateOnLoop();

		//Bot is ready to use
		console.log(`Ready! Logged in as ${client.user.tag}`);
	}
};