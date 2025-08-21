#!/usr/bin/env python3
"""
This script scans SQL files in the directories:
DTT-ANA-PRD, DTT-TRX-PRD, and Livesql3.
It extracts the database name (via the USE statement),
table names (from CREATE TABLE statements) and reports
any columns that contain "NPI" (case-insensitive) in their names.
"""
import logging
logging.basicConfig(level=logging.WARN)
logger = logging.getLogger(__name__)
import os
import re

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
    # table_regex = re.compile(r"CREATE\s+\S+\s+[`']?(\w+)[`']?\s*\((.*?)\)\s*;", re.IGNORECASE | re.DOTALL | re.MULTILINE)
    table_regex = re.compile(r".*CREATE\s+\S+\s+[`']?(\S+)[`']?\s*\((.*)\)\s*.*GO", re.IGNORECASE | re.DOTALL | re.MULTILINE)
    # print(content)
    for table_match in table_regex.finditer(content):
        table_name = table_match.group(1)
        logger.warning(f"Found table: {table_name}")
        columns_section = table_match.group(2)
        logger.warning(f"Found columns: {columns_section}")
        # Split columns by newlines, and try to extract column definitions line by line
        for line in columns_section.splitlines():
            line = line.strip()
            if not line:
                continue
            col_name_match = re.match(r"[`']?(\w+)[`']?\s", line, re.IGNORECASE)
            if col_name_match and re.search(r"npi", col_name_match.group(1), re.IGNORECASE):
                logger.debug(f"Found column with NPI: {col_name_match.group(1)} in table: {table_name}")
                results.append({
                    'database': database,
                    'table': table_name,
                    'column': col_name_match.group(1),
                    'file': filepath
                })
    exit()
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
    if not results:
        print("No columns with 'NPI' found in the provided SQL files.")
    else:
        print("Found the following NPI columns:")
        for result in results:
            print(f"Database: {result['database']}, Table: {result['table']}, Column: {result['column']} (File: {result['file']})")

if __name__ == "__main__":
    directories = ["DTT-ANA-PRD", "DTT-TRX-PRD", "Livesql3"]
    results = scan_directories(directories)
    print_report(results)
