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

def scan_sql_file(filepath, mode, columns=True):
    results = []
    regexDentistWords = r'(?:dentist|practioner|doctor|nurse|hygienist|provider|ortho)'
    regexOfficeWords = r'(?:office|location|practice)'
    regexNetworkWords = r'(?:dental partner network|partner network|dental network|partner|network)'
    regexDSOWords = r'(?:dental service organization|dental support organization|service org|support organization|support org|dso|service|support)'
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
    if mode == 'foreignkeys':
        fk_regex = re.compile(r"""
                ALTER\s+TABLE\s+\[\s*(?P<schema>[^\]]+)\s*\]\.\[\s*(?P<table>[^\]]+)\s*\]\s+WITH\s+CHECK\s+ADD\s+CONSTRAINT\s+\[\s*(?P<constraint>[^\]]+)\s*\]\s+FOREIGN\s+KEY\s*\(\s*\[\s*(?P<fk_key>[^\]]+)\s*\]\s*\)\s+REFERENCES\s+\[\s*(?P<fk_schema>[^\]]+)\s*\]\.\[\s*(?P<fk_table>[^\]]+)\s*\]\s*\(\s*\[\s*(?P<fk_column>[^\]]+)\s*\]\s*\)
            """, re.IGNORECASE | re.DOTALL | re.VERBOSE)
        for fk_match in fk_regex.finditer(content):
            schema = fk_match.group("schema")
            table = fk_match.group("table")
            constraint = fk_match.group("constraint")
            fk_key = fk_match.group("fk_key")
            fk_schema = fk_match.group("fk_schema")
            fk_table = fk_match.group("fk_table")
            fk_column = fk_match.group("fk_column")
            results.append({
                'database': database,
                'schema': schema,
                'table': f"{table}",
                'fk_key': f"{fk_key}",
                'constraint': f"{constraint}",
                'fk_schema': f"{fk_schema}",
                'fk_table': f"{fk_table}",
                'fk_column': f"{fk_column}",
                'file': filepath
            })
        return results

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
        schema = table_match.group(2)
        table_name = table_match.group(3)
        columns_section = table_match.group(4)
        logger.debug(f"Found table: {table_name} with column defs: {columns_section}")
        # exit()

        pattern = None
        if columns:
            if mode == 'dentists':
                pattern = r'\[\s*([^\]]*' + regexDentistWords + r'[^\]]*)\s*\]\s*\['
            elif mode == 'offices':
                pattern = r'\[\s*([^\]]*' + regexOfficeWords + r'[^\]]*)\s*\]\s*\['
            elif mode == 'networks':
                pattern = r'\[\s*([^\]]*' + regexNetworkWords + r'[^\]]*)\s*\]\s*\['
            elif mode == 'dsos':
                pattern = r'\[\s*([^\]]*' + regexDSOWords + r'[^\]]*)\s*\]\s*\['
            if pattern:
                tablenames_regex = re.compile(pattern, flags=re.IGNORECASE | re.DOTALL)
                for match_found in tablenames_regex.finditer(columns_section):
                    match = match_found.group(1)
                    logger.warning(f"Found table (matched column name filter): {table_name} with column match: {match}")
                    results.append({
                        'schema': schema,
                        'database': database,
                        'table': table_name,
                        'column': match,
                        'file': filepath
                    })
        else:
            if mode == 'dentists':
                pattern = regexDentistWords
            elif mode == 'offices':
                pattern = regexOfficeWords
            elif mode == 'networks':
                pattern = regexNetworkWords
            elif mode == 'dsos':
                pattern = regexDSOWords
            if pattern:
                tables_regex = re.compile(pattern, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE)
                for match_found in tables_regex.finditer(table_name):
                    match = match_found.group(0)
                    logger.warning(f"Found table (matched table name filter): {table_name} with match: {match}")
                    results.append({
                        'schema': schema,
                        'database': database,
                        'table': table_name,
                        'column': match,
                        'file': filepath
                    })
    return results

def scan_directories(paths, mode, table_names):
    all_results = []
    for path in paths:
        if os.path.isfile(path):
            file_results = scan_sql_file(path, mode, not table_names)
            all_results.extend(file_results)
        elif os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                for file in files:
                    if file.lower().endswith('.sql'):
                        full_path = os.path.join(root, file)
                        file_results = scan_sql_file(full_path, mode, not table_names)
                        all_results.extend(file_results)
        else:
            logger.error(f"Path {path} is neither a file nor a directory")
    return all_results

def print_report(results, mode):
    writer = csv.writer(sys.stdout)
    if mode == 'foreignkeys':
        writer.writerow(["Database", "Schema", "Source Table", "Source Key Column", "Target Table", "Target Column", "File"])
        for result in results:
            writer.writerow([result["database"], result["schema"], result["table"], result["fk_key"], result["constraint"], result["fk_table"], result["fk_column"], result["file"]])
    else:
        writer.writerow(["Database", "Schema", "Table", "Matched", "File"])
        for result in results:
            writer.writerow([result["database"], result["schema"], result["table"], result["column"], result["file"]])

def print_json_report(results):
    print(json.dumps(results, indent=4))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan SQL files for schema details and report matching tables/columns based on mode. By default, reports columns from table definitions. Use --no-columns (-nc) to only report based on table names.")
    parser.add_argument('--dentists', action='store_true', help="Scan for dentists")
    parser.add_argument('--offices', action='store_true', help="Scan for offices")
    parser.add_argument('--networks', action='store_true', help="Scan for networks")
    parser.add_argument('--dsos', action='store_true', help="Scan for DSO-related items")
    parser.add_argument('--json', '-js', action='store_true', help="Output in JSON format")
    parser.add_argument('--table-names', '-tn', action='store_true', help="Only show tables on column matches")
    parser.add_argument('--no-columns', '-nc', action='store_true', help="Scan table names for entity words(ignoring column definitions)")
    parser.add_argument('--foreign-keys', '-fc', action='store_true', help="Extract all foreign key definitions")
    parser.add_argument('paths', nargs='*', help="Directories and/or SQL file paths to process")
    args = parser.parse_args()

    modes = []
    if args.dentists:
        modes.append('dentists')
    if args.offices:
        modes.append('offices')
    if args.networks:
        modes.append('networks')
    if args.dsos:
        modes.append('dsos')
    if args.foreign_keys:
        modes.append('foreignkeys')
    if not modes:
        parser.error("No mode selected. Use at least one of --dentists, --offices, --networks, or --dsos.")

    if args.paths:
        paths = args.paths
    else:
        paths = ["DTT-ANA-PRD", "DTT-TRX-PRD", "Livesql3"]

    for mode in modes:
        results = scan_directories(paths, mode, args.table_names)
        if args.foreign_keys:
            header = f"--- Report for {mode.capitalize()} Mode ({'Table Name matches Only' if args.table_names else 'Sources and Targets'}) ---"
        else:
            header = f"--- Report for {mode.capitalize()} Mode ({'Table Name matchess Only' if args.table_names else 'Tables and Columns'}) ---"
        if args.json:
            print_json_report(results)
        else:
            print_report(results, mode)
