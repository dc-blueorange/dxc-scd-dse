#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check for required arguments
if (process.argv.length < 4) {
    console.error("Usage: node enhance-dentist-columns.js <dentist-columns.json> <foreign-keys.json>");
    process.exit(1);
}

const dentistFilePath = process.argv[2];
const foreignKeysFilePath = process.argv[3];

// Load dentist-columns.json
let dentistData;
try {
    const dentistJson = fs.readFileSync(dentistFilePath, 'utf8');
    dentistData = JSON.parse(dentistJson);
} catch (err) {
    console.error("Error reading or parsing dentist columns file:", err);
    process.exit(1);
}

// Load foreign-keys.json
let foreignKeys;
try {
    const fkJson = fs.readFileSync(foreignKeysFilePath, 'utf8');
    foreignKeys = JSON.parse(fkJson);
} catch (err) {
    console.error("Error reading or parsing foreign keys file:", err);
    process.exit(1);
}

// Process each entry from dentistData.
// We assume each element has a property 'match' which is a string in the format "Table.Column".
// For each 'match', we scan the foreignKeys and find all references whose "target" exactly matches the 'match' string.
// Then, we add a "references" property (an array) to a copy of the original entry.
const enhancedData = dentistData.map(entry => {
    let searchKey = entry.match;
    // In case you need to handle alternate fields (e.g., table and column), uncomment the following:
    // if (!searchKey && entry.table && entry.column) {
    //     searchKey = `${entry.table}.${entry.column}`;
    // }
    const references = searchKey ? foreignKeys.filter(fk => fk.target === searchKey)
                                  .map(fk => ({ database: fk.database, source: fk.source })) : [];
    return Object.assign({}, entry, { references });
});

// Create a new filename by appending '-enhanced' before the .json extension.
const parsedDentistPath = path.parse(dentistFilePath);
const newFileName = parsedDentistPath.name + "-enhanced" + parsedDentistPath.ext;
const newFilePath = path.join(parsedDentistPath.dir, newFileName);

try {
    fs.writeFileSync(newFilePath, JSON.stringify(enhancedData, null, 4));
    console.log("Enhanced dentist columns file created: " + newFilePath);
} catch (err) {
    console.error("Error writing enhanced file:", err);
    process.exit(1);
}
