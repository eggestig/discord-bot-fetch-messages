module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		//Bot is ready to use
		console.log(`Ready! Logged in as ${client.user.tag}`);
	}
};