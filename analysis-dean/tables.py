#!/usr/bin/env python3
"""
This script scans SQL files in the directories:
DTT-ANA-PRD, DTT-TRX-PRD, and Livesql3.
It extracts the database name (via the USE statement),
table names (from CREATE TABLE statements) and reports
any tables whose names contain "NPI", "dentist", "hygienist", or "provider" (case-insensitive).
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
    logger.debug(f"Database determined: {database} file={filepath}")

    # Find all table definitions
    # Assumes table definition starts with CREATE TABLE and ends with a semicolon, supporting multiline statements
    table_regex = re.compile(r"CREATE\s+\S+\s+[`']?(\S+)[`']?\s*\((.*)\)\s*.*GO", re.IGNORECASE | re.DOTALL | re.MULTILINE)
    for table_match in table_regex.finditer(content):
        table_name = table_match.group(1)
        # Only include tables with matching table names: NPI, dentist, hygienist, or provider.
        tbl_match = re.search(r'\b(?:NPI|dentist|hygienist|provider)\b', table_name, flags=re.IGNORECASE | re.MULTILINE | re.DOTALL)
        if tbl_match:
            matching_table = tbl_match.group(0)
            logger.warning(f"Found table (matched table name filter): {table_name} with match: {matching_table}")
            results.append({
                'database': database,
                'table': table_name,
                'matched': matching_table,
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
    writer.writerow(["Database", "Table", "Matched", "File"])
    for result in results:
        writer.writerow([result["database"], result["table"], result["matched"], result["file"]])

def print_markdown_report(results):
    print("| Database | Table | Matched | File |")
    print("| --- | --- | --- | --- |")
    for result in results:
        print(f"| {result['database']} | {result['table']} | {result['matched']} | {result['file']} |")

def print_json_report(results):
    import json
    print(json.dumps(results, indent=4))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan SQL files and report database table info for table name matching")
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
#!/usr/bin/env python3
"""
This script scans SQL files in the directories:
DTT-ANA-PRD, DTT-TRX-PRD, and Livesql3.
It supports multiple modes via commandline flags:
--dentists: Reports any tables whose names contain "NPI", "dentist", "hygienist", or "provider" (case-insensitive).
--networks: Reports any tables whose names contain "provider", "network provider", "dental network provider", "network", or "dental network" (case-insensitive).
--dsos: Reports any tables whose names contain "dso", "dental service organization", "service org", "dental support organization", "support organization", "support org", "service", or "support" (case-insensitive).
"""
import logging
import os
import re
import argparse
import csv
import sys

logging.basicConfig(level=logging.WARN)
logger = logging.getLogger(__name__)

def scan_sql_file(filepath, mode):
    results = []
    try:
        with open(filepath, 'r', encoding='utf-16', errors='replace') as f:
            content = f.read()
        logger.debug(f"Processing file: {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return results

    db_match = re.search(r"USE\s+\[(\w+)\]", content, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE)
    database = db_match.group(1) if db_match else "Unknown"
    logger.warning(f"Database determined: {database} file={filepath}")

    table_regex = re.compile(r"CREATE\s+\S+\s+[`']?(\S+)[`']?\s*\((.*)\)\s*.*GO", 
                             re.IGNORECASE | re.DOTALL | re.MULTILINE)
    for table_match in table_regex.finditer(content):
        table_name = table_match.group(1)
        # Instead of searching columns_section, search table_name for pattern matches.
        pattern = None
        if mode == 'dentists':
            pattern = r'\b(?:NPI|dentist|hygienist|provider)\b'
        elif mode == 'networks':
            pattern = r'\b(?:dental network provider|network provider|dental network|provider|network)\b'
        elif mode == 'dsos':
            pattern = r'\b(?:dental service organization|dental support organization|service org|support organization|support org|dso|service|support)\b'
        if pattern and re.search(pattern, table_name, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE):
            match_found = re.search(pattern, table_name, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE).group(0)
            logger.warning(f"Found table (matched table name filter): {table_name} with match: {match_found}")
            results.append({
                'database': database,
                'table': table_name,
                'match': match_found,
                'file': filepath
            })
    return results

def scan_directories(directories, mode):
    all_results = []
    for directory in directories:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.lower().endswith('.sql'):
                    full_path = os.path.join(root, file)
                    file_results = scan_sql_file(full_path, mode)
                    all_results.extend(file_results)
    return all_results

def print_report(results, header):
    print(header)
    writer = csv.writer(sys.stdout)
    writer.writerow(["Database", "Table", "Matched", "File"])
    for result in results:
        writer.writerow([result["database"], result["table"], result["match"], result["file"]])

def print_json_report(results, header):
    import json
    print(header)
    print(json.dumps(results, indent=4))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan SQL files and report table names based on mode")
    parser.add_argument('--dentists', action='store_true', help="Scan for dentists table names")
    parser.add_argument('--networks', action='store_true', help="Scan for networks table names")
    parser.add_argument('--dsos', action='store_true', help="Scan for DSO-related table names")
    parser.add_argument('--json', '-js', action='store_true', help="Output in JSON format")
    args = parser.parse_args()
    modes = []
    if args.dentists:
        modes.append('dentists')
    if args.networks:
        modes.append('networks')
    if args.dsos:
        modes.append('dsos')
    if not modes:
        parser.error("No mode selected. Use at least one of --dentists, --networks, or --dsos.")
    directories = ["DTT-ANA-PRD", "DTT-TRX-PRD", "Livesql3"]
    for mode in modes:
        results = scan_directories(directories, mode)
        header = f"--- Report for {mode.capitalize()} Table Name Mode ---"
        if args.json:
            print_json_report(results, header)
        else:
            print_report(results, header)
