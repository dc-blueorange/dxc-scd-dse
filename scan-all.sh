#!/bin/bash
# Existing commands in scan-all.sh
echo "Scanning all files..."

# (Other scan-all.sh commands go here)

# At the bottom, add jq command to count the elements in analysis-dean/dentist-references.json
echo "Counting elements in analysis-dean/dentist-references.json:"
jq 'length' analysis-dean/dentist-references.json
