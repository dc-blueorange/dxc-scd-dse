python3 analysis-dean/schema-analyzer.py --dentists > analysis-dean/dentist-columns.csv
python3 analysis-dean/schema-analyzer.py --dentists -nc > analysis-dean/dentist-tables.csv
python3 analysis-dean/schema-analyzer.py --dentists -js > analysis-dean/dentist-columns.json
python3 analysis-dean/schema-analyzer.py --dentists -js -nc > analysis-dean/dentist-tables.json

python3 analysis-dean/schema-analyzer.py --offices > analysis-dean/office-columns.csv
python3 analysis-dean/schema-analyzer.py --offices -nc > analysis-dean/office-tables.csv
python3 analysis-dean/schema-analyzer.py --offices -js > analysis-dean/office-columns.json
python3 analysis-dean/schema-analyzer.py --offices -js -nc > analysis-dean/office-tables.json

python3 analysis-dean/schema-analyzer.py --networks > analysis-dean/network-columns.csv
python3 analysis-dean/schema-analyzer.py --networks -nc > analysis-dean/network-tables.csv
python3 analysis-dean/schema-analyzer.py --networks -js > analysis-dean/network-columns.json
python3 analysis-dean/schema-analyzer.py --networks -js -nc > analysis-dean/network-tables.json

python3 analysis-dean/schema-analyzer.py --dsos > analysis-dean/dso-columns.csv
python3 analysis-dean/schema-analyzer.py --dsos -nc > analysis-dean/dso-tables.csv
python3 analysis-dean/schema-analyzer.py --dsos -js > analysis-dean/dso-columns.json
python3 analysis-dean/schema-analyzer.py --dsos -js -nc > analysis-dean/dso-tables.json

python3 analysis-dean/schema-analyzer.py --foreign-keys > analysis-dean/foreign-keys.csv
python3 analysis-dean/schema-analyzer.py --foreign-keys -js > analysis-dean/foreign-keys.json

python3 analysis-dean/column-references.py -sc analysis-dean/dentist-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/dentist-references.json 
python3 analysis-dean/column-references.py -sc analysis-dean/office-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/office-references.json 
python3 analysis-dean/column-references.py -sc analysis-dean/network-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/network-references.json 
python3 analysis-dean/column-references.py -sc analysis-dean/dso-columns.json -fk analysis-dean/foreign-keys.json --out analysis-dean/dso-references.json

echo
echo
echo "Counting dentists, offices, networks and DSOs..."
echo Dentists: $(jq 'length' analysis-dean/dentist-tables.json)
echo Dentist columns: $(jq 'length' analysis-dean/dentist-columns.json)
echo Offices: $(jq 'length' analysis-dean/office-tables.json)
echo Office columns: $(jq 'length' analysis-dean/office-columns.json)
echo Provider Networks: $(jq 'length' analysis-dean/network-tables.json)
echo Provider Network columns: $(jq 'length' analysis-dean/network-columns.json)
echo DSOs: $(jq 'length' analysis-dean/dso-tables.json)
echo DSO columns: $(jq 'length' analysis-dean/dso-columns.json)
echo
echo "Counting foreign key references to dentists, offices, networks and DSOs..."
echo Dentist references: $(jq 'length' analysis-dean/dentist-references.json)
echo Office references: $(jq 'length' analysis-dean/office-references.json)
echo Provider Network references: $(jq 'length' analysis-dean/network-references.json)
echo DSO references: $(jq 'length' analysis-dean/dso-references.json)
