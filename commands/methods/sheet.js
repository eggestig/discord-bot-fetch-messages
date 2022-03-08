const readline        = require('readline');
const {google}        = require('googleapis');

/* Local */
const SETTINGS        = require('./misc.js');
const { read } = require('./fileHandler.js');   


/* ---------------- */
/*      OAuth2      */
/* ---------------- */

/**
 * Call Google Spreadsheet API
 * 
 * @param {Object} api API function
 * @param {Object} data Data parameters for the API
 * @returns {Promise<boolean>} true if success, false if failed 
 */
async function callApi(api, data) {
const credentials = SETTINGS.getSettings().spreadsheet.credentials;

  // Authorize a client with credentials.
  const oAuth2Client = await authorize(credentials);

  if(!oAuth2Client)
    return console.error("Manual Error: Failed to Authorize");

  //Then call the Google Sheets API
  const result = await api(oAuth2Client, data);

  return result;
};

/**
 * Create an OAuth2 client with the given credentials
 * 
 * @param   {Object} credentials The authorization client credentials.
 * @returns {Promise<google.auth.OAuth2>} The authorized OAuth2 client
 */
async function authorize(credentials) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token, and that the token is still valid
    let token = SETTINGS.getSettings().spreadsheet.token;
    if (!token || (token && ((new Date()).getTime() >= (new Date(token.expiry_date)).getTime()))) {
      token                         = await getNewToken(oAuth2Client);
      const newSettings             = SETTINGS.getSettings();
      newSettings.spreadsheet.token = token;

      SETTINGS.updateSettings(newSettings);
    }

    oAuth2Client.setCredentials(token);
    return oAuth2Client;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * 
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @returns {Promise<Object>} Credential token if resolved, null if rejected
 */
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: SETTINGS.getSettings().access_type,
    scope: SETTINGS.getSettings().spreadsheet.scopes,
  });
  console.log('Authorize this app by visiting this url:', authUrl);

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(async (resolve, reject) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error while trying to retrieve access token', err);
          reject(null);
        }
        oAuth2Client.setCredentials(token);
        resolve(token);
      });
    })
  });
}

/* ---------------- */
/*      Update      */
/* ---------------- */

function displayFilters() {

  console.log("+-------------------+");
  console.log("| WHITELIST FILTERS |");
  console.log("+-------------------+");
  console.log();
  console.log();


  console.log("    -Channel(s)-");
  SETTINGS.getSettings().userInput.whitelist.channels.forEach((channelId) => {
    console.log(channelId);
  });
  console.log();
  console.log("+-------------------+");
  console.log();
  
  console.log("    -Word(s)-");
  SETTINGS.getSettings().userInput.whitelist.messages.words.forEach((word) => {
    console.log(word);
  });
  console.log();
  console.log("+-------------------+");
  console.log();

  console.log("    -Author ID(s)-");
  SETTINGS.getSettings().userInput.whitelist.messages.authorsId.forEach((authorId) => {
    console.log(authorId);
  });
  console.log();
  console.log("+-------------------+");
  console.log();

  console.log("    -Type(s)-");
  SETTINGS.getSettings().userInput.whitelist.messages.types.forEach((type) => {
    console.log(type);
  });
  console.log();
  console.log("+-------------------+");
  console.log();

  console.log("    -Date(s)-");
  SETTINGS.getSettings().userInput.whitelist.messages.intervals.forEach((interval) => {
    console.log(`${(new Date(interval.startDate)).toISOString()} - ${(new Date(interval.endDate)).toISOString()}`);
  });
  console.log();
  console.log("+-------------------+");
  console.log();


  console.log("+-------------------+");
  console.log("| BLACKLIST FILTERS |");
  console.log("+-------------------+");
  console.log();
  console.log();


  console.log("    -Channel(s)-");
  SETTINGS.getSettings().userInput.blacklist.channels.forEach((channelId) => {
    console.log(channelId);
  });
  console.log();
  console.log("+-------------------+");
  console.log();
  
  console.log("    -Word(s)-");
  SETTINGS.getSettings().userInput.blacklist.messages.words.forEach((word) => {
    console.log(word);
  });
  console.log();
  console.log("+-------------------+");
  console.log();

  console.log("    -Author ID(s)-");
  SETTINGS.getSettings().userInput.blacklist.messages.authorsId.forEach((authorId) => {
    console.log(authorId);
  });
  console.log();
  console.log("+-------------------+");
  console.log();

  console.log("    -Type(s)-");
  SETTINGS.getSettings().userInput.blacklist.messages.types.forEach((type) => {
    console.log(type);
  });
  console.log();
  console.log("+-------------------+");
  console.log();

  console.log("    -Date(s)-");
  SETTINGS.getSettings().userInput.blacklist.messages.intervals.forEach((interval) => {
    console.log(`${(new Date(interval.startDate)).toISOString()} - ${(new Date(interval.endDate)).toISOString()}`);
  });
  console.log();
  console.log("+-------------------+");
  console.log();
}


/**
 * Update the spreadsheet
 * 
 * 
 */
 async function update(saveWordFreqFromLocalFiles, sortWordFrequency) {
    if(SETTINGS.getSettings().spreadsheet.id == "") {
      await callApi(createSpreadsheet, "Ember Sword Messages Stats");
      SETTINGS.refreshSettings();
    }

  return new Promise(async (resolve, rejectRes) => {
    /* Normal sheets */
    console.log();
    console.log("*******************************************************************************************");
    console.log();
    await updateNormal(saveWordFreqFromLocalFiles, sortWordFrequency); 
    /* Custom sheets */
    //await updateCustom(saveWordFreqFromLocalFiles, sortWordFrequency);
    //console.log("Sheets have been updated!");

    resolve();
  });
};

/**
 * Update the Custom sheet with frequency words
 * 
 */
 async function updateCustom(saveWordFreqFromLocalFiles, sortWordFrequency) {
  const sheets        = SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display;
  const wordFreqPath  = `${SETTINGS.getSettings().words.save.folder}/${SETTINGS.getSettings().words.save.name}.${SETTINGS.getSettings().words.save.fileType}`;
  let customWords     = [];

  //Custom input
  await callApi(fetchAndSaveSpreadsheetInput, {name: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.names[1]});
  SETTINGS.refreshSettings();

  console.log("+---------------------------+");
  console.log(`|          CUSTOM           |`);
  console.log(`|                           |`);
  console.log("+---------------------------+");

  saveWordFreqFromLocalFiles();
  customWords = sortWordFrequency(JSON.parse(read(wordFreqPath), null, 2)).result.words;

  console.log(`+---------------------------+`);
  console.log(`| Total Unique Words ${customWords.length}`.padding(27) + ` |`);
  console.log("+---------------------------+");
  console.log();
  console.log("*******************************************************************************************");
  console.log();

  //Sheet Custom
  return new Promise(async (resolve, reject) => {
    resolve(await updateHelper(customWords.slice(customWords.length - SETTINGS.getSettings().spreadsheet.top).reverse(), {id: sheets.ids[4], name: sheets.names[4]}));
  });
};

/**
 * Update the non-custom sheets with frequency words
 * 
 * @param {Object[]} words Top frequency words to update with
 */
 async function updateNormal(saveWordFreqFromLocalFiles, sortWordFrequency) {
  const sheets        = SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display;
  const wordFreqPath  = `${SETTINGS.getSettings().words.save.folder}/${SETTINGS.getSettings().words.save.name}.${SETTINGS.getSettings().words.save.fileType}`;
  let normalWords     = [];

  return new Promise(async (resolve, reject) => {
    SETTINGS.getSettings().userInput.blacklist.intervals = [];
    endDate = Date.now();

    console.log("User input for normal sheets: ");
    //Sheet Year
    const yearSeconds = (SETTINGS.getSettings().messages.millisecondsInSecond * SETTINGS.getSettings().timings.spreadsheet.year);
    //Get word frequencies (YEAR)
    await callApi(fetchAndSaveSpreadsheetInput, {name: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.names[0]});
    
    SETTINGS.refreshSettings();
    SETTINGS.getSettings().userInput.whitelist.messages.intervals = [{startDate: endDate - yearSeconds, endDate: endDate}];
    SETTINGS.updateSettings(SETTINGS.getSettings());
    SETTINGS.refreshSettings();

    console.log("+--------------------------+");
    console.log(`|           YEAR           |`);
    console.log(`| ${(new Date(endDate - yearSeconds)).toISOString()} |`);
    console.log(`|            --            |`);
    console.log(`| ${(new Date(endDate)).toISOString()} |`);
    console.log("+--------------------------+");
    
    //displayFilters();
    saveWordFreqFromLocalFiles();
    normalWords = sortWordFrequency(JSON.parse(read(wordFreqPath), null, 2)).result.words;

    console.log(`+---------------------------+`);
    console.log(`| Total Unique Words ${normalWords.length}`.padding(27) + ` |`);
    console.log("+---------------------------+");
    console.log();
    console.log("*******************************************************************************************");
    console.log();

    await updateHelper(normalWords.slice(normalWords.length - SETTINGS.getSettings().spreadsheet.top).reverse(), {id: sheets.ids[0], name: sheets.names[0]});


    //Sheet Month
    const monthSeconds = (SETTINGS.getSettings().messages.millisecondsInSecond * SETTINGS.getSettings().timings.spreadsheet.month);
    //Get word frequencies (MONTH)
    await callApi(fetchAndSaveSpreadsheetInput, {name: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.names[0]});
    
    SETTINGS.refreshSettings();
    SETTINGS.getSettings().userInput.whitelist.messages.intervals = [{startDate: endDate - monthSeconds, endDate: endDate}];
    SETTINGS.updateSettings(SETTINGS.getSettings());
    SETTINGS.refreshSettings();

    console.log("+---------------------------+");
    console.log(`|           MONTH           |`);
    console.log(`| ${(new Date(endDate - monthSeconds)).toISOString()}  |`);
    console.log(`|             -             |`);
    console.log(`| ${(new Date(endDate)).toISOString()}  |`);
    console.log("+---------------------------+");
    
    //displayFilters();
    saveWordFreqFromLocalFiles();
    normalWords = sortWordFrequency(JSON.parse(read(wordFreqPath), null, 2)).result.words;

    console.log(`+---------------------------+`);
    console.log(`| Total Unique Words ${normalWords.length}`.padding(27) + ` |`);
    console.log("+---------------------------+");
    console.log();
    console.log("*******************************************************************************************");
    console.log();

    await updateHelper(normalWords.slice(normalWords.length - SETTINGS.getSettings().spreadsheet.top).reverse(), {id: sheets.ids[1], name: sheets.names[1]});

    
    //Sheet Week
    const weekSeconds = (SETTINGS.getSettings().messages.millisecondsInSecond * SETTINGS.getSettings().timings.spreadsheet.week);
    //Get word frequencies (WEEK)
    await callApi(fetchAndSaveSpreadsheetInput, {name: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.names[0]});
    
    SETTINGS.refreshSettings();
    SETTINGS.getSettings().userInput.whitelist.messages.intervals = [{startDate: endDate - weekSeconds, endDate: endDate}];
    SETTINGS.updateSettings(SETTINGS.getSettings());
    SETTINGS.refreshSettings();

    console.log("+--------------------------+");
    console.log(`|           WEEK           |`);
    console.log(`| ${(new Date(endDate - weekSeconds)).toISOString()} |`);
    console.log(`|            --            |`);
    console.log(`| ${(new Date(endDate)).toISOString()} |`);
    console.log("+--------------------------+");
    
    //displayFilters();
    saveWordFreqFromLocalFiles();
    normalWords = sortWordFrequency(JSON.parse(read(wordFreqPath), null, 2)).result.words;

    console.log(`+---------------------------+`);
    console.log(`| Total Unique Words ${normalWords.length}`.padding(27) + ` |`);
    console.log("+---------------------------+");
    console.log();
    console.log("*******************************************************************************************");
    console.log();

    await updateHelper(normalWords.slice(normalWords.length - SETTINGS.getSettings().spreadsheet.top).reverse(), {id: sheets.ids[2], name: sheets.names[2]});

    
    //Sheet Day
    const daySeconds = (SETTINGS.getSettings().messages.millisecondsInSecond * SETTINGS.getSettings().timings.spreadsheet.day);
    //Get word frequencies (DAY)
    await callApi(fetchAndSaveSpreadsheetInput, {name: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.names[0]});
    
    SETTINGS.refreshSettings();
    SETTINGS.getSettings().userInput.whitelist.messages.intervals = [{startDate: endDate - daySeconds, endDate: endDate}];
    SETTINGS.updateSettings(SETTINGS.getSettings());
    SETTINGS.refreshSettings();

    console.log("+---------------------------+");
    console.log(`|            Day            |`);
    console.log(`| ${(new Date(endDate - daySeconds)).toISOString()}  |`);
    console.log(`|             -             |`);
    console.log(`| ${(new Date(endDate)).toISOString()}  |`);
    console.log("+---------------------------+");
    
    //displayFilters();
    saveWordFreqFromLocalFiles();
    normalWords = sortWordFrequency(JSON.parse(read(wordFreqPath), null, 2)).result.words;

    console.log(`+---------------------------+`);
    console.log(`| Total Unique Words ${normalWords.length}`.padding(27) + ` |`);
    console.log("+---------------------------+");
    console.log();
    console.log("*******************************************************************************************");
    console.log();

    await updateHelper(normalWords.slice(normalWords.length - SETTINGS.getSettings().spreadsheet.top).reverse(), {id: sheets.ids[3], name: sheets.names[3]});


    //Resolve
    resolve();
  });
};

/**
 * Send word frequencies to sheet
 * @param {Object[]} words Words to send to the sheet
 * @param {Object} sheetInfo Sheet ID and sheet name 
 * 
 */
async function updateHelper(words, sheetInfo) {
  return new Promise(async (resolve, reject) => {
    await callApi(clearMessages, {sheetName: sheetInfo.name}).then(async () => {
        resolve(await callApi(updateMessages, {words: words, sheetName: sheetInfo.name}));
    });
  });
}


/* ---------------- */
/*     API CALLS    */
/* ---------------- */

/**
 * API CALL: Update messages in spreadsheet
 * 
 * @param {google.auth.OAuth2} auth Authorized OAuth2 client
 * @param {Object} data Data object with the words and the sheet to update
 * @returns {Promise<boolean>} true if resolved, false if rejected
 */
async function updateMessages(auth, data) {
    const spreadsheetId           = SETTINGS.getSettings().spreadsheet.id;
    const dataRange               = SETTINGS.getSettings().spreadsheet.dataRange;
    const valueInputOption        = SETTINGS.getSettings().spreadsheet.updateRequest.valueInputOption;
    const includeValuesInResponse = SETTINGS.getSettings().spreadsheet.updateRequest.includeValuesInResponse
    const majorDimension          = SETTINGS.getSettings().spreadsheet.updateRequest.majorDimension;
    const version                 = SETTINGS.getSettings().spreadsheet.version;
    
    return new Promise(async (resolve, reject) => {
      if(!data || !data.words || !data.sheetName) {
        console.error("No data, word(s), or sheet provided, returning.");
        resolve(false);
      }
      
      const request = {
          spreadsheetId:            spreadsheetId,
          range:                    data.sheetName + "!" + dataRange,
          valueInputOption:         valueInputOption,
          includeValuesInResponse:  includeValuesInResponse,
          resource: {
              "majorDimension": majorDimension,
              "range":          data.sheetName + "!" + dataRange,
              "values":         parseWords(data.words)
          },
          auth: auth
      };
      try {
        const sheets = google.sheets({version: version, auth});
        sheets.spreadsheets.values.update(request, (err, res) => {
            if (err) {
              console.error('The API returned an error: ' + err);
              reject(false);
            }
            resolve(true);
        });   
      } catch (err) {
        console.error(err);
        reject(false);
      }
    });
}

/**
 * API CALL: Clear messages in spreadsheet
 * 
 * @param {google.auth.OAuth2} auth Authorized OAuth2 client
 * @param {Object} data Data object with the sheet to update
 * @returns {Promise<boolean>} true if resolved, false if rejected
 */
async function clearMessages(auth, data) {
    const request = {
        spreadsheetId: SETTINGS.getSettings().spreadsheet.id,
        range: `${data.sheetName}!${SETTINGS.getSettings().spreadsheet.dataRange}`,
        auth: auth,
      };
    
    return new Promise(async (resolve, reject) => {
      try {
        const sheets = google.sheets({version: SETTINGS.getSettings().spreadsheet.version, auth});
        sheets.spreadsheets.values.clear(request, (err, res) => {
            if (err) {
              console.log('The API returned an error: ' + err);
              //reject(false);
              resolve(true);
            }
            resolve(true)
        });   
      } catch (err) {
        console.error(err);
        reject(false);
      }
    });
}

/**
 * API CALL: Create a spreadsheet and update the current settings file with the new id
 * 
 * @param {google.auth.OAuth2} auth Authorized OAuth2 client
 * @param {Object} data Data object with the title of the spreadsheet
 * @returns {Promise<boolean>} true if resolved, false if rejected
 */
async function createSpreadsheet(auth, data) {

  const request = {
    resource: {
      properties: {
        title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.title
      },
      sheets: [
        //Display sheets
        {
          properties: {
            sheetId: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.ids[0],
            title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.names[0]
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][7]
                      }
                    },
                  ]
                }
              ],
              startColumn: 0,
              startRow: 0
            }
          ]
        },
        {
          properties: {
            sheetId: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.ids[1],
            title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.names[1]
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][7]
                      }
                    },
                  ]
                }
              ],
              startColumn: 0,
              startRow: 0
            }
          ]
        },
        {
          properties: {
            sheetId: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.ids[2],
            title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.names[2]
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][7]
                      }
                    },
                  ]
                }
              ],
              startColumn: 0,
              startRow: 0
            }
          ]
        },
        {
          properties: {
            sheetId: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.ids[3],
            title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.names[3]
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][7]
                      }
                    },
                  ]
                }
              ],
              startColumn: 0,
              startRow: 0
            }
          ]
        },
        {
          properties: {
            sheetId: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.ids[4],
            title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.names[4]
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.initData[0][7]
                      }
                    },
                  ]
                }
              ],
              startColumn: 0,
              startRow: 0
            }
          ]
        },
        //Input sheets
        {
          properties: {
            sheetId: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.ids[0],
            title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.names[0]
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][7]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][8]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][9]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][10]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][11]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][12]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][13]
                      } 
                    }
                  ]
                },
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][7]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][8]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][9]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][10]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][11]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][12]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][13]
                      } 
                    }
                  ]
                },
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][7]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][8]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][9]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][10]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][11]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][12]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][13]
                      } 
                    }
                  ]
                },
              ],
              startColumn: 0,
              startRow: 0
            }
          ]
        },
        {
          properties: {
            sheetId: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.ids[1],
            title: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.names[1]
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][7]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][8]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][9]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][10]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][11]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][12]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[0][13]
                      } 
                    }
                  ]
                },
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][7]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][8]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][9]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][10]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][11]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][12]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[1][13]
                      } 
                    }
                  ]
                },
                {
                  values: [
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][0]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][1]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][2]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][3]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][4]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][5]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][6]
                      }
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][7]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][8]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][9]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][10]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][11]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][12]
                      } 
                    },
                    {
                      userEnteredValue: {
                        stringValue: SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.initData[2][13]
                      } 
                    }
                  ]
                },
              ],
              startColumn: 0,
              startRow: 0
            }
          ]
        }
      ]
    },
    auth: auth,
  };

  return new Promise(async (resolve, reject) => {
    try {
      const sheets = google.sheets({version: SETTINGS.getSettings().spreadsheet.version, auth});    
      sheets.spreadsheets.create(request, (err, res) => {
          if (err) {
            console.error('The API returned an error: ' + err);
            reject(false);
          }

          let newSettings = SETTINGS.getSettings();
          newSettings.spreadsheet.id = res.data.spreadsheetId;
          SETTINGS.updateSettings(newSettings);
          resolve(true);
      });   
    } catch (err) {
      console.error(err);
      reject(false);
    }
  });
}

/**
 * API CALL: Fetch spreadsheet input and save it to settings.json
 * 
 * @param {google.auth.OAuth2} auth Authorized OAuth2 client
 * @param {Object} data Sheet name
 * @returns {Promise<boolean>} true if resolved, false if rejected
 */
 async function fetchAndSaveSpreadsheetInput(auth, data) {
  const inputRequestSettings = SETTINGS.getSettings().spreadsheet.inputRequest;

  //console.log(`Fetching input: ${data.name}!${inputRequestSettings.dataRange}`);
  const request = {
    spreadsheetId: SETTINGS.getSettings().spreadsheet.id,
    range: `${data.name}!${inputRequestSettings.dataRange}`,
    valueRenderOption: inputRequestSettings.valueRenderOption,
    majorDimension: inputRequestSettings.majorDimension,
    auth: auth,
  };

  return new Promise(async (resolve, reject) => {
    await fetchAndSaveHelper(auth, request);
    resolve();
  });
}

/**
 * API CALL Helper: Send get request
 * 
 * @param {google.auth.OAuth2} auth Authorized OAuth2 client
 * @param {Object} request 
 * @returns {Promise<boolean>} true if resolved, false if rejected
 */
async function fetchAndSaveHelper(auth, request) {
  return new Promise(async (resolve, reject) => {
    try {
      const sheets = google.sheets({version: SETTINGS.getSettings().spreadsheet.version, auth});    
      sheets.spreadsheets.values.get(request, (err, res) => {
          if (err) {
            console.error('The API returned an error: ' + err);
            reject(false);
          }
          const newSettings = parseInput(res.data.values);
          SETTINGS.updateSettings(newSettings);
          SETTINGS.refreshSettings();
          resolve(true);
      });   
    } catch (err) {
      console.error(err);
      reject(false);
    }
  });
}


/* ----------------- */
/*       Methods     */
/* ----------------- */

function parseInput(input) {
  SETTINGS.refreshSettings();
  let settings = SETTINGS.getSettings();

  if(!input) {
    //console.error("No input! Setting userInput to default (No filter)");
    settings.userInput = {
      "whitelist": {
        "channels": [],
        "messages": {
          "words": [],
          "authorsId": [],
          "types": [],
          "intervals": [
            {
              "startDate": 0,
              "endDate": 4800000000000 // 2122-02-08T13:20:00.000Z
            }
          ],
          "authorId": []
        }
      },
      "blacklist": {
        "channels": [],
        "messages": {
          "words": [],
          "authorsId": [],
          "types": [],
          "intervals": [],
          "authorId": []
        }
      }
    };
    return settings;
  }

  /* WHITELIST */
  
  // Channels
  if(input[0] && input[0].length > 0) {
    let channels = [];
    
    input[0].forEach((channelId) => {
      if(channelId && channelId != "") 
        channels.push(channelId);
    });

    settings.userInput.whitelist.channels                     = channels;
  } else {
    settings.userInput.whitelist.channels                     = [];
  } 

  // Words
  if(input[1] && input[1].length > 0) {
    let words = [];
    
    input[1].forEach((word) => {
      if(word && word != "") 
        words.push(word);
    });
    settings.userInput.whitelist.messages.words               = words;
  } else {
    settings.userInput.whitelist.messages.words               = [];
  } 

  // Author IDs
  if(input[2] && input[2].length > 0) {
    let ids = [];
    
    input[2].forEach((id) => {
      if(id && id != "") 
        ids.push(id);
    });
    settings.userInput.whitelist.messages.authorId            = ids;
  } else {
    settings.userInput.whitelist.messages.authorId            = [];
  } 

  // Types
  if(input[3] && input[3].length > 0) {
    let types = [];
    
    input[3].forEach((type) => {
      if(type && type != "") 
        ids.push(type);
    });
    settings.userInput.whitelist.messages.types               = types;
  } else {
    settings.userInput.whitelist.messages.types               = [];
  } 

  //Intervals
  let whitelistIntervals = [];
  let whitelistLoops     = 0;
  if(input[4])
    whitelistLoops = input[4].length;
  if(input[5] && whitelistLoops < input[5].length)
    whitelistLoops = input[5].length;

  for(let i = 0; i < whitelistLoops; i++) {
    let interval = {startDate: 0, endDate: 4800000000000}; // 2122-02-08T13:20:00.000Z
    if(input[4] && input[4][i] && input[4][i] > 0) 
      interval.startDate = input[4][i];

    if(input[5] && input[5][i] && input[5][i] > 0)
      interval.endDate = input[5][i];

    whitelistIntervals.push(interval);
  }

  if(whitelistIntervals.length == 0)
    whitelistIntervals = [{startDate: 0, endDate: 4800000000000}]; // 2122-02-08T13:20:00.000Z

  settings.userInput.whitelist.messages.intervals = whitelistIntervals;


  /* BLACKLIST */
  
  // Channels
  if(input[7] && input[7].length > 0) {
    let channels = [];
    
    input[7].forEach((channelId) => {
      if(channelId && channelId != "") 
        channels.push(channelId);
    });
    settings.userInput.blacklist.channels                     = channels;
  } else {
    settings.userInput.blacklist.channels                     = [];
  } 

  // Words
  if(input[8] && input[8].length > 0) {
    let words = [];
    
    input[8].forEach((word) => {
      if(word && word != "") 
        words.push(word);
    });
    settings.userInput.blacklist.messages.words               = words;
  } else {
    settings.userInput.blacklist.messages.words               = [];
  } 

  // Author IDs
  if(input[9] && input[9].length > 0) {
    let ids = [];
    
    input[9].forEach((id) => {
      if(id && id != "") 
        ids.push(id);
    });
    settings.userInput.blacklist.messages.authorId            = ids;
  } else {
    settings.userInput.blacklist.messages.authorId            = [];
  } 

  // Types
  if(input[10] && input[10].length > 0) {
    let types = [];
    
    input[10].forEach((type) => {
      if(type && type != "") 
        ids.push(type);
    });
    settings.userInput.blacklist.messages.types               = types;
  } else {
    settings.userInput.blacklist.messages.types               = [];
  } 

  //Intervals
  let blacklistIntervals = [];
  let blacklistLoops     = 0;
  if(input[11])
    blacklistLoops = input[11].length;
  if(input[12] && blacklistLoops < input[12].length)
    blacklistLoops = input[12].length;

  for(let i = 0; i < blacklistLoops; i++) {
    let interval = {startDate: 0, endDate: 4800000000000}; // 2122-02-08T13:20:00.000Z

    if(input[11] && input[11][i] && input[11][i] > 0) 
      interval.startDate = input[11][i];

    if(input[12] && input[12][i] && input[12][i] > 0)
      interval.endDate = input[12][i];

    blacklistIntervals.push(interval);
  }

  settings.userInput.blacklist.messages.intervals = blacklistIntervals;
  return settings;
}

function parseMessage(message) {
  return [
      message.word,
      message.data.frequency,
      message.data.lastMessage.id,
      message.data.lastMessage.channelId,
      message.data.lastMessage.authorId,
      (new Date(message.data.lastMessage.createdTimestamp)).toISOString(),
      message.data.lastMessage.type,
      message.data.lastMessage.content
  ];
}

function parseMessageJson(message) {
  if(!message.authorId && message.author)
    message.authorId = message.author.id;

  return {
      "id": message.id,
      "channelId": message.channelId,
      "authorId": message.authorId,
      "createdTimestamp": message.createdTimestamp,
      "content": message.content,
      "type": message.type
  };
}

function parseWords(words) {
  let result = [];
//Last message ID	Last Channel ID	Last Author ID	Last Created	Last Type	Last message content
/*
"frequency": 1,
    "lastMessage": {
      "id": "934373340263637052",
      "channelId": "934372249895575572",
      "authorId": "934093843228393562",
      "createdTimestamp": 1642842364136,
      "content": "`dieziege — 01/12/2022\r\nwhich blockchain, sorry\r\n#sir sluyo of blockraiders — 01/12/2022\r\npolygon",
      "type": "DEFAULT"
    }
*/

  words.forEach((word) => {
    result.push([
      word.word,
      word.data.frequency,
      word.data.lastMessage.id,
      word.data.lastMessage.channelId,
      word.data.lastMessage.authorId,
      word.data.lastMessage.createdTimestamp,
      word.data.lastMessage.type,
      word.data.lastMessage.content
    ]);
  });

  return result;
}


function getSheetsDisplay() {
  return SETTINGS.getSettings().spreadsheet.creationSettingsSheets.display.ids.length;
}

function getSheetsInput() {
  return SETTINGS.getSettings().spreadsheet.creationSettingsSheets.input.ids.length;
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
    callApi,
    updateMessages,
    clearMessages,
    createSpreadsheet,
    parseMessage,
    parseMessageJson,
    getSheetsDisplay,
    getSheetsInput,
    update
}