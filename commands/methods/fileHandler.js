/* Local */
const fs = require('fs');

// Returns true if sucess, or false if it failed
function write(path, data, log) {
    try {
        fs.writeFileSync(path, data, "utf8");
        if(log)
            console.log(`'${path}' written successfully`);

        return true;
    } catch(err) {
        if(log)
            console.error(`'${path}' ${err}`);
    }
    return false;
}

// Returns data if success, or null if failed
function read(path, log) {
    try {
        const data = fs.readFileSync(path, "utf8");
        if(log)
            console.log(`'${path}' read successfully`);
        return data;
    } catch(err) {
        if(log)
            console.error(`'${path}' ${err}`);
    }
    return null;
}

module.exports = {
    write,
    read
}