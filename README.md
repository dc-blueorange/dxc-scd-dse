# DXC Schema Analysis

Manual analysis results plus Tools and tool results for analyzing DentalXChange's production MS SQL database schemas.

## Analysis Results

### Manual
Luciano's hand-curated schema analysis searching for entity names and synonyms and connections.
His findings can be found in [here](/analysis-luciano/).

### Automated
Results from a set of analysis scripts attempting the same can be found [here](/analysis-dean/).

This folder additionally includes a set of all foreign key relations ([csv](analysis-dean/foreign-keys.csv) and [json](analysis-dean/foreign-keys.json)) across all product database schema provided.

## How to Run Automated Analysis
First generate analysis data by scanning all schema:
```
./scan-all.sh
```

This will land a set of .json and .csv files in [here](/analysis-dean/) and dump out stats to the command line.

These stats as well as the .json and .csv files may be used directly for analysis. They also form the data for 2 vizualizations under the [src](/src) directory, which you can run as follows:
```
./run.sh
```

Of the 2 vizualizations, the Foreign Keys Diagram is perhaps the more useful.

![DXC Foreign Keys Diagram](/DXC%20Foreign%20Keys.png)
