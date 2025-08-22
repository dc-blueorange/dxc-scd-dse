python3 analysis-dean/schema-analyzer.py --dentists > analysis-dean/dentist-columns.csv
python3 analysis-dean/schema-analyzer.py --dentists -nc > analysis-dean/dentist-tables.csv
python3 analysis-dean/schema-analyzer.py --dentists -js > analysis-dean/dentist-columns.json
python3 analysis-dean/schema-analyzer.py --dentists -js -nc > analysis-dean/dentist-tables.json

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