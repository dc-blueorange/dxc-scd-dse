#!/usr/bin/env python
const fs = require('fs');
const path = require('path');
const { ArgumentParser } = require('argparse');

const parser = new ArgumentParser({
    description: 'Enhance columnsSource columns file with foreign key references'
});
parser.add_argument('--source-columns', '-sc', { required: true, help: 'Path to columnsSource columns JSON file' });
parser.add_argument('--foreign-keys', '-fk', { required: true, help: 'Path to foreign keys JSON file' });
parser.add_argument('--out', { required: false, help: 'Path to output enhanced JSON file' });

const args = parser.parse_args();

const columnsSourceFilePath = args.columnsSource;
const foreignKeysFilePath = args.keys;
let outputFilePath;

// Load columnsSource-columns.json
let columnsSourceData;
try {
    const columnsSourceJson = fs.readFileSync(columnsSourceFilePath, 'utf8');
    columnsSourceData = JSON.parse(columnsSourceJson);
} catch (err) {
    console.error("Error reading or parsing columnsSource columns file:", err);
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

// Process each entry from columnsSourceData.
// Each element is assumed to have a property 'match' which is a string in the format "Table.Column".
// For each 'match', find all references in foreignKeys whose "target" exactly matches the 'match' string.
// Add a "references" property (an array) to a copy of the original entry.
const enhancedData = columnsSourceData.map(entry => {
    let searchKey = entry.match;
    const references = searchKey ? foreignKeys.filter(fk => fk.target === searchKey)
                                  .map(fk => ({ database: fk.database, source: fk.source }))
                                  : [];
    return Object.assign({}, entry, { references });
});

// Determine output filename: if the --out flag is provided, use that; otherwise, generate one.
if (args.out) {
    outputFilePath = args.out;
} else {
    const parsedcolumnsSourcePath = path.parse(columnsSourceFilePath);
    const newFileName = parsedcolumnsSourcePath.name + "-enhanced" + parsedcolumnsSourcePath.ext;
    outputFilePath = path.join(parsedcolumnsSourcePath.dir, newFileName);
}

try {
    fs.writeFileSync(outputFilePath, JSON.stringify(enhancedData, null, 4));
    console.log("Enhanced columnsSource columns file created: " + outputFilePath);
} catch (err) {
    console.error("Error writing enhanced file:", err);
    process.exit(1);
}
