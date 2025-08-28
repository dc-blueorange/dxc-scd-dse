#!/usr/bin/env python3
import argparse
import json
import os
import sys
import logging
import re
import csv

def load_json_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            # Remove any header lines before the JSON array
            start_index = content.find('[')
            if start_index == -1:
                raise ValueError("No JSON array found in file.")
            json_content = content[start_index:]
            return json.loads(json_content)
    except Exception as e:
        logging.error(f"Error reading or parsing JSON file {filepath}: {e}")
        sys.exit(1)

def load_csv_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            # Convert each row to a dict
            rows = [row for row in reader]
            # Normalize keys by stripping whitespace
            for r in rows:
                for key in list(r.keys()):
                    normalized_key = key.strip()
                    if normalized_key != key:
                        r[normalized_key] = r.pop(key)
            return rows
    except Exception as e:
        logging.error(f"Error reading or parsing CSV file {filepath}: {e}")
        sys.exit(1)

def load_foreign_keys(filepath):
    if filepath.lower().endswith(".csv"):
        logging.info("Detected CSV file for foreign keys.")
        return load_csv_file(filepath)
    else:
        logging.info("Assuming JSON format for foreign keys.")
        return load_json_file(filepath)

def main():
    parser = argparse.ArgumentParser(
        description='Enhance columnsSource columns file with foreign key references'
    )
    parser.add_argument('--source-columns', '-sc', required=True, help='Path to columnsSource columns JSON file')
    parser.add_argument('--foreign-keys', '-fk', required=True, help='Path to foreign keys JSON or CSV file')
    parser.add_argument('--out', required=False, help='Path to output enhanced JSON file')
    parser.add_argument('--offices', action='store_true', help='Only process rows with "office" or "location" in the table name')
    parser.add_argument('--log-level', required=False, default='INFO', help='Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)')
    args = parser.parse_args()

    # Set logging level based on flag
    numeric_level = getattr(logging, args.log_level.upper(), None)
    if not isinstance(numeric_level, int):
        print(f'Invalid log level: {args.log_level}', file=sys.stderr)
        sys.exit(1)
    logging.basicConfig(level=numeric_level, format='%(levelname)s: %(message)s')

    source_file = args.source_columns
    foreign_keys_file = args.foreign_keys

    logging.info("Loading source columns file: %s", source_file)
    source_data = load_json_file(source_file)

    logging.info("Loading foreign keys file: %s", foreign_keys_file)
    fk_data = load_foreign_keys(foreign_keys_file)

    enhanced_data = []
    # If --offices flag is set, prepare the regex used for filtering.
    office_regex = re.compile(r'\b(?:office|location)\b', re.IGNORECASE) if args.offices else None

    for entry in source_data:
        # If --offices flag is set, only process entry if its table matches the regex.
        if office_regex:
            table_field = entry.get("table", "")
            if not office_regex.search(table_field):
                logging.debug("Skipping entry due to offices filter: %s", entry)
                continue

        # Retrieve the required fields from the source record.
        source_db = entry.get("database")
        source_table = entry.get("table")
        source_column = entry.get("column")
        references = []
        if source_db and source_table and source_column:
            for fk in fk_data:
                fk_db = fk.get("database")
                table = fk.get("table")
                fk_key = fk.get("fk_key")
                if fk_db == source_db and table == source_table and fk_key == source_column:
                    references.append({
                        "database": fk_db,
                        "constraint": fk.get("constraint"),
                        "fk_schema": fk.get("fk_schema"),
                        "fk_table": fk.get("fk_table"),
                        "fk_column": fk.get("fk_column"),
                        "file": fk.get("file")
                    })
            logging.debug("Found references for database '%s', table '%s', column '%s': %s", source_db, source_table, source_column, references)
        else:
            logging.warning("Entry missing one or more required fields (database, table, column): %s", entry)
        new_entry = dict(entry)
        new_entry["references"] = references
        if references:
            enhanced_data.append(new_entry)

    if args.out:
        output_file = args.out
    else:
        base, ext = os.path.splitext(source_file)
        output_file = base + "-enhanced" + ext

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(enhanced_data, f, indent=4)
        logging.info("Enhanced columnsSource columns file created: %s", output_file)
    except Exception as e:
        logging.error("Error writing enhanced file: %s", e)
        sys.exit(1)

if __name__ == '__main__':
    main()
