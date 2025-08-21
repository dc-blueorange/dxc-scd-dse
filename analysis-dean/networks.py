#!/usr/bin/env python3
"""
This script scans SQL files in the directories:
DTT-ANA-PRD, DTT-TRX-PRD, and Livesql3.
It extracts the database name (via the USE statement),
table names (from CREATE TABLE statements) and reports
any columns that contain "provider", "network provider", "dental network provider", "network", or "dental network" in their names.
"""
import logging
logging.basicConfig(level=logging.WARN)
logger = logging.getLogger(__name__)
import os
import re
import argparse

def scan_sql_file(filepath):
    results = []
    try:
        with open(filepath, 'r', encoding='utf-16', errors='replace') as f:
            content = f.read()
        logger.debug(f"Processing file: {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return results
    
    # strip newllines
    # content = re.sub(r"\\n", " ", content)

    # Get database name (if defined)
    db_match = re.search(r"USE\s+\[(\w+)\]", content, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE)
    database = db_match.group(1) if db_match else "Unknown"
    logger.warning(f"Database determined: {database} file={filepath}")

    # Find all table definitions
    # Assumes table definition starts with CREATE TABLE and ends with a semicolon, supporting multiline statements
    table_regex = re.compile(r"CREATE\s+\S+\s+[`']?(\S+)[`']?\s*\((.*)\)\s*.*GO", re.IGNORECASE | re.DOTALL | re.MULTILINE)
    # print(content)
    for table_match in table_regex.finditer(content):
        table_name = table_match.group(1)
        columns_section = table_match.group(2)
        # Only include tables with matching column names: provider, network provider, dental network provider, network, or dental network.
        col_match = re.search(r'\b(?:dental network provider|network provider|dental network|provider|network)\b', columns_section, flags=re.IGNORECASE)
        if col_match:
            matching_column = col_match.group(0)
            logger.warning(f"Found table (matched column filter): {table_name} with column: {matching_column}")
            results.append({
                'database': database,
                'table': table_name,
                'column': matching_column,
                'file': filepath
            })
    return results

def scan_directories(directories):
    all_results = []
    for directory in directories:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.lower().endswith('.sql'):
                    full_path = os.path.join(root, file)
                    file_results = scan_sql_file(full_path)
                    all_results.extend(file_results)
    return all_results

def print_report(results):
    import csv, sys
    writer = csv.writer(sys.stdout)
    writer.writerow(["Database", "Table", "Column", "File"])
    for result in results:
        writer.writerow([result["database"], result["table"], result["column"], result["file"]])

def print_markdown_report(results):
    print("| Database | Table | Column | File |")
    print("| --- | --- | --- | --- |")
    for result in results:
        print(f"| {result['database']} | {result['table']} | {result['column']} | {result['file']} |")

def print_json_report(results):
    import json
    print(json.dumps(results, indent=4))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan SQL files and report database table info for provider information")
    parser.add_argument('-md', '--markdown', action='store_true', help="Output in markdown format")
    parser.add_argument('-js', '--json', action='store_true', help="Output in JSON format")
    args = parser.parse_args()
    directories = ["DTT-ANA-PRD", "DTT-TRX-PRD", "Livesql3"]
    results = scan_directories(directories)
    if args.json:
        print_json_report(results)
    elif args.markdown:
        print_markdown_report(results)
    else:
        print_report(results)
