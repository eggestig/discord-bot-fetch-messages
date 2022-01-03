# Discord Bot - Game-manager

A very, **very** simple and bareback bot for creating channels (text and voice) for individual games and assigning (or unassigning) yourself to them via roles by pressing buttons.

## Commands
The bot currently covers (4) commands. (Parameter types: `[REQUIRED]` and `[optional]`)
* `/displaygames` - List all games and allows you to pick roles (which gives access to text and voice channels)
* `/addgame [TITLE]` - Add a game (up to 25 games are currently supported).
* `/deletegame [TITLE]` - Remove a game (Use the name of the role or the button text in /displaygames)
* `/delete game [index] [length]` - Remove all games after `[index]` and up to `[length]`. If no parameters are given: `[index] = 0` & `[length] = info.games.length` (where info.games is where all the games are stored)

## Events
The bot currently covers (1) event (disregarding the command and ready event)
* `buttonClick` - When a button is clicked in the server.


## Setup
Since you want the bot running on your own server, you need to complete a few tasks beforehand.

1. You need to install nodejs and all the requiring modules (tbh I don't know exactly which ones you need to manually install, haven't tried this on a fresh install)
2. You need to create the `config.json` file, and fill it in using the following structure: 
```
{
    "token": "",
    "clientId": "",
    "guildId": ""
}
```
You can find your guild ID by just rightclicking your server and copying the ID. The token ID and client ID respectively can be found in your discord developer dashboard as followed:  
<img src="https://raw.githubusercontent.com/eggestig/discord-bot-game-manager/main/tokenID.png"
     alt="Discord developer dashboard, green arrow pointing towards the token ID">  
  
<img src="https://raw.githubusercontent.com/eggestig/discord-bot-game-manager/main/applicationID.png"
     alt="Discord developer dashboard, green arrow pointing towards the application ID">  
  
3. You may also need to change your bot's permissions, the ones that I currently use are the following:
<img src="https://raw.githubusercontent.com/eggestig/discord-bot-game-manager/main/permissions.PNG"
     alt="Discord developer dashboard, permissions">  
  
4. To run the bot, you just have to type the command `node index.js` in the folder `/discord-bot-game-manager` (though this could be renamed to anything)
