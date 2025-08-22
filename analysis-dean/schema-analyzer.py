#!/usr/bin/env python3
"""
This script scans SQL files for schema details and reports matching tables/columns based on mode.
By default, it reports columns from table definitions (like columns.py).
Use --no-columns (-nc) to only report based on table names (like tables.py).
Modes:
  --dentists : Matches any identifiers containing "NPI", "dentist", "hygienist", or "provider".
  --networks : Matches any identifiers containing "dental network provider", "network provider", "dental network", "provider", or "network".
  --dsos     : Matches any identifiers containing "dental service organization", "dental support organization", "service org", "support organization", "support org", "dso", "service", or "support".
"""
import logging
import os
import re
import argparse
import csv
import sys
import json

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

def scan_columns_sql_file(filepath, mode):
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

    table_regex = re.compile(
        r"""
        (CREATE\s+(?:TABLE|VIEW))           # group(1): CREATE TABLE or CREATE VIEW
        \s+\[([^\]]+)\]\.\[([^\]]+)\]       # group(2): schema, group(3): object name
        \s*\(?(.*?)\)?                      # group(4): contents inside () (non-greedy)
        (?:ON\s+\[PRIMARY\][^\)]*)?         # ignore filegroup etc (optional, Table only)
        \s*GO\b                             # GO batch separator
        """,
        re.IGNORECASE | re.VERBOSE | re.DOTALL | re.MULTILINE
    )
    for table_match in table_regex.finditer(content):
        table_name = table_match.group(3)
        columns_section = table_match.group(4)
        logger.debug(f"Found table: {table_name} with column defs: {columns_section}")
        # exit()

        pattern = None
        if mode == 'dentists':
            pattern = r'\[\s*([^\]]*(?:NPI|dentist|hygienist|provider)[^\]]*)\s*\]\s*\['
        elif mode == 'networks':
            pattern = r'\[\s*([^\]]*(?:dental network provider|network provider|dental network|provider|network)[^\]]*)\s*\]\s*\['
        elif mode == 'dsos':
            pattern = r'\[\s*([^\]]*(?:dental service organization|dental support organization|service org|support organization|support org|dso|service|support)[^\]]*)\s*\]\s*\['
        if pattern:
            tablenames_regex = re.compile(pattern, flags=re.IGNORECASE | re.DOTALL)
            for match_found in tablenames_regex.finditer(columns_section):
                match = match_found.group(1)
                logger.warning(f"Found table (matched table name filter): {table_name} with match: {match}")
                results.append({
                    'database': database,
                    'table': table_name,
                    'match': match,
                    'file': filepath
                })
    return results

def scan_tables_sql_file(filepath, mode):
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

    table_regex = re.compile(
        r"""
        (CREATE\s+(?:TABLE|VIEW))           # group(1): CREATE TABLE or CREATE VIEW
        \s+\[([^\]]+)\]\.\[([^\]]+)\]       # group(2): schema, group(3): object name
        \s*\(?(.*?)\)?                      # group(4): contents inside () (non-greedy)
        (?:ON\s+\[PRIMARY\][^\)]*)?         # ignore filegroup etc (optional, Table only)
        \s*GO\b                             # GO batch separator
        """,
        re.IGNORECASE | re.VERBOSE | re.DOTALL | re.MULTILINE
    )
    for table_match in table_regex.finditer(content):
        table_name = table_match.group(3)
        pattern = None
        if mode == 'dentists':
            pattern = r'(?:NPI|dentist|hygienist|provider)'
        elif mode == 'networks':
            pattern = r'(?:dental network provider|network provider|dental network|provider|network)'
        elif mode == 'dsos':
            pattern = r'(?:dental service organization|dental support organization|service org|support organization|support org|dso|service|support)'
        if pattern:
            tables_regex = re.compile(pattern, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE)
            for match_found in tables_regex.finditer(table_name):
                match = match_found.group(0)
                logger.warning(f"Found table (matched table name filter): {table_name} with match: {match}")
                results.append({
                    'database': database,
                    'table': table_name,
                    'match': match,
                    'file': filepath
                })
    return results

def scan_directories(paths, mode, no_columns):
    all_results = []
    for path in paths:
        if os.path.isfile(path):
            if no_columns:
                file_results = scan_tables_sql_file(path, mode)
            else:
                file_results = scan_columns_sql_file(path, mode)
            all_results.extend(file_results)
        elif os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                for file in files:
                    if file.lower().endswith('.sql'):
                        full_path = os.path.join(root, file)
                        if no_columns:
                            file_results = scan_tables_sql_file(full_path, mode)
                        else:
                            file_results = scan_columns_sql_file(full_path, mode)
                        all_results.extend(file_results)
        else:
            logger.error(f"Path {path} is neither a file nor a directory")
    return all_results

def print_report(results, header):
    print(header)
    writer = csv.writer(sys.stdout)
    writer.writerow(["Database", "Table", "Matched", "File"])
    for result in results:
        writer.writerow([result["database"], result["table"], result["match"], result["file"]])

def print_json_report(results, header):
    if header:
        print(header)
    print(json.dumps(results, indent=4))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan SQL files for schema details and report matching tables/columns based on mode. By default, reports columns from table definitions. Use --no-columns (-nc) to only report based on table names.")
    parser.add_argument('--dentists', action='store_true', help="Scan for dentists")
    parser.add_argument('--networks', action='store_true', help="Scan for networks")
    parser.add_argument('--dsos', action='store_true', help="Scan for DSO-related items")
    parser.add_argument('--json', '-js', action='store_true', help="Output in JSON format")
    parser.add_argument('--no-columns', '-nc', action='store_true', help="Only show tables (ignoring column definitions)")
    parser.add_argument('paths', nargs='*', help="Directories and/or SQL file paths to process")
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

    if args.paths:
        paths = args.paths
    else:
        paths = ["DTT-ANA-PRD", "DTT-TRX-PRD", "Livesql3"]

    for mode in modes:
        results = scan_directories(paths, mode, args.no_columns)
        header = f"--- Report for {mode.capitalize()} Mode ({'Tables Only' if args.no_columns else 'Tables and Columns'}) ---"
        if args.json:
            print_json_report(results, header)
        else:
            print_report(results, header)
