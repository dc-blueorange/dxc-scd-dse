python3 analysis-dean/schema-analyzer.py --dentists > analysis-dean/dentist-columns.csv
python3 analysis-dean/schema-analyzer.py --dentists -tn > analysis-dean/dentist-tables.csv
python3 analysis-dean/schema-analyzer.py --dentists -js > analysis-dean/dentist-columns.json
python3 analysis-dean/schema-analyzer.py --dentists -js -tn > analysis-dean/dentist-tables.json
jq '[.[] | "\(.schema),\(.database),\(.table)"] | unique | .[]' analysis-dean/dentist-columns.json > analysis-dean/dentist-table-column-matches.csv
jq 'map({schema: .schema, database: .database, table:.table}) | unique' analysis-dean/dentist-columns.json > analysis-dean/dentist-table-column-matches.json
jq '[.[] | "\(.schema).\(.database)"] | unique | .[]' analysis-dean/dentist-columns.json > analysis-dean/dentist-unique-table-column-matches.csv
jq 'map({schema: .schema, database: .database}) | unique' analysis-dean/dentist-columns.json > analysis-dean/dentist-unique-table-column-matches.json

python3 analysis-dean/schema-analyzer.py --offices > analysis-dean/office-columns.csv
python3 analysis-dean/schema-analyzer.py --offices -tn > analysis-dean/office-tables.csv
python3 analysis-dean/schema-analyzer.py --offices -js > analysis-dean/office-columns.json
python3 analysis-dean/schema-analyzer.py --offices -js -tn > analysis-dean/office-tables.json
jq '[.[] | "\(.schema),\(.database),\(.table)"] | unique | .[]' analysis-dean/office-columns.json > analysis-dean/office-table-column-matches.csv
jq 'map({schema: .schema, database: .database, table:.table}) | unique' analysis-dean/office-columns.json > analysis-dean/office-table-column-matches.json
jq '[.[] | "\(.schema).\(.database)"] | unique | .[]' analysis-dean/office-columns.json > analysis-dean/office-unique-table-column-matches.csv
jq 'map({schema: .schema, database: .database}) | unique' analysis-dean/office-columns.json > analysis-dean/office-unique-table-column-matches.json

python3 analysis-dean/schema-analyzer.py --networks > analysis-dean/network-columns.csv
python3 analysis-dean/schema-analyzer.py --networks -tn > analysis-dean/network-tables.csv
python3 analysis-dean/schema-analyzer.py --networks -js > analysis-dean/network-columns.json
python3 analysis-dean/schema-analyzer.py --networks -js -tn > analysis-dean/network-tables.json
jq '[.[] | "\(.schema),\(.database),\(.table)"] | unique | .[]' analysis-dean/network-columns.json > analysis-dean/network-table-column-matches.csv
jq 'map({schema: .schema, database: .database, table:.table}) | unique' analysis-dean/network-columns.json > analysis-dean/network-table-column-matches.json
jq '[.[] | "\(.schema).\(.database)"] | unique | .[]' analysis-dean/network-columns.json > analysis-dean/network-unique-table-column-matches.csv
jq 'map({schema: .schema, database: .database}) | unique' analysis-dean/network-columns.json > analysis-dean/network-unique-table-column-matches.json

python3 analysis-dean/schema-analyzer.py --dsos > analysis-dean/dso-columns.csv
python3 analysis-dean/schema-analyzer.py --dsos -tn > analysis-dean/dso-tables.csv
python3 analysis-dean/schema-analyzer.py --dsos -js > analysis-dean/dso-columns.json
python3 analysis-dean/schema-analyzer.py --dsos -js -tn > analysis-dean/dso-tables.json
jq '[.[] | "\(.schema),\(.database),\(.table)"] | unique | .[]' analysis-dean/dso-columns.json > analysis-dean/dso-table-column-matches.csv
jq 'map({schema: .schema, database: .database, table:.table}) | unique' analysis-dean/dso-columns.json > analysis-dean/dso-table-column-matches.json
jq '[.[] | "\(.schema).\(.database)"] | unique | .[]' analysis-dean/dso-columns.json > analysis-dean/dso-unique-table-column-matches.csv
jq 'map({schema: .schema, database: .database}) | unique' analysis-dean/dso-columns.json > analysis-dean/dso-unique-table-column-matches.json

python3 analysis-dean/schema-analyzer.py --foreign-keys > analysis-dean/foreign-keys.csv
python3 analysis-dean/schema-analyzer.py --foreign-keys -js > analysis-dean/foreign-keys.json

python3 analysis-dean/column-references.py -sc analysis-dean/dentist-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/dentist-references.json 
python3 analysis-dean/column-references.py -sc analysis-dean/office-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/office-references.json 
python3 analysis-dean/column-references.py -sc analysis-dean/network-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/network-references.json 
python3 analysis-dean/column-references.py -sc analysis-dean/dso-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/dso-references.json

echo
echo "Counting table and column names that match dentists, offices, networks and DSOs...and synonyms."
echo Dentist table name matches: $(jq 'length' analysis-dean/dentist-tables.json)
echo Dentist column name matches: $(jq 'length' analysis-dean/dentist-columns.json)
echo Office table name matches: $(jq 'length' analysis-dean/office-tables.json)
echo Office column name matches: $(jq 'length' analysis-dean/office-columns.json)
echo Provider Networks table name matches: $(jq 'length' analysis-dean/network-tables.json)
echo Provider Network column name matches: $(jq 'length' analysis-dean/network-columns.json)
echo DSO table name matches: $(jq 'length' analysis-dean/dso-tables.json)
echo DSO column name matches: $(jq 'length' analysis-dean/dso-columns.json)

echo
echo "Counting unique dentists, offices, networks and DSOs with column hits..."
echo Dentists with Column Hits: $(wc -l < analysis-dean/dentist-unique-table-column-matches.csv)
echo Offices with Column Hits: $(wc -l < analysis-dean/office-unique-table-column-matches.csv)
echo Providers with Column Hitsetworks: $(wc -l < analysis-dean/network-unique-table-column-matches.csv)
echo DSOs with Column Hits: $(wc -l < analysis-dean/dso-unique-table-column-matches.csv)
echo
echo "Counting foreign key references to dentists, offices, networks and DSOs..."
echo Dentist references: $(jq 'length' analysis-dean/dentist-references.json)
echo Office references: $(jq 'length' analysis-dean/office-references.json)
echo Provider Network references: $(jq 'length' analysis-dean/network-references.json)
echo DSO references: $(jq 'length' analysis-dean/dso-references.json)

echo Counting all entity matches \(bag-of-words\)
echo All word matches: $(cat analysis-dean/*-columns.csv | wc -l)