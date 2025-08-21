#!/usr/bin/env python3
"""
This script scans SQL files in the directories:
DTT-ANA-PRD, DTT-TRX-PRD, and Livesql3.
It supports multiple modes via commandline flags:
--dentists: Reports any columns that contain "NPI", "dentist", "hygienist", or "provider" in their names.
--networks: Reports any columns that contain "provider", "network provider", "dental network provider", "network", or "dental network" in their names.
--dsos: Reports any columns that contain "dso", "dental service organization", "service org", "dental support organization", "support organization", "support org", "service", or "support" in their names.
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
        columns_section = table_match.group(2)
        pattern = None
        if mode == 'dentists':
            # Matching column names: NPI, dentist, hygienist, or provider.
            pattern = r'\b(?:NPI|dentist|hygienist|provider)\b'
        elif mode == 'networks':
            # Matching column names: provider, network provider, dental network provider, network, or dental network.
            pattern = r'\b(?:dental network provider|network provider|dental network|provider|network)\b'
        elif mode == 'dsos':
            # Matching column names: dso, dental service organization, service org, dental support organization, support organization, support org, service, or support.
            pattern = r'\b(?:dental service organization|dental support organization|service org|support organization|support org|dso|service|support)\b'
        if pattern and re.search(pattern, columns_section, flags=re.IGNORECASE):
            match_found = re.search(pattern, columns_section, flags=re.IGNORECASE).group(0)
            logger.warning(f"Found table: {table_name} with match: {match_found}")
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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan SQL files and report columns based on mode")
    parser.add_argument('--dentists', action='store_true', help="Scan for dentists columns")
    parser.add_argument('--networks', action='store_true', help="Scan for networks columns")
    parser.add_argument('--dsos', action='store_true', help="Scan for DSO-related columns")
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
        header = f"--- Report for {mode.capitalize()} Mode ---"
        print_report(results, header)
