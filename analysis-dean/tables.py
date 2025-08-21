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
            pattern = r'(?:NPI|dentist|hygienist|provider)'
        elif mode == 'networks':
            pattern = r'(?:dental network provider|network provider|dental network|provider|network)'
        elif mode == 'dsos':
            pattern = r'((?:dental service organization|dental support organization|service org|support organization|support org|dso|service|support))'
        if pattern:
            tables_regex = re.compile(pattern, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE)
            for match_found in tables_regex.finditer(table_name):
                match = match_found.group(1)
                logger.warning(f"Found table (matched table name filter): {table_name} with match: {match}")
                results.append({
                    'database': database,
                    'table': table_name,
                    'match': match,
                    'file': filepath
                })
                print('nerf', table_name, match)
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
