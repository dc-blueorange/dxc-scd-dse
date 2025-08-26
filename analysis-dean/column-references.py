#!/usr/bin/env python3
import argparse
import json
import os
import sys
import logging

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
        logging.error(f"Error reading or parsing file {filepath}: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description='Enhance columnsSource columns file with foreign key references'
    )
    parser.add_argument('--source-columns', '-sc', required=True, help='Path to columnsSource columns JSON file')
    parser.add_argument('--foreign-keys', '-fk', required=True, help='Path to foreign keys JSON file')
    parser.add_argument('--out', required=False, help='Path to output enhanced JSON file')
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
    fk_data = load_json_file(foreign_keys_file)

    enhanced_data = []
    for entry in source_data:
        # Retrieve the required fields from the source record
        source_db = entry.get("database")
        source_table = entry.get("table")
        source_column = entry.get("column")
        references = []
        if source_db and source_table and source_column:
            for fk in fk_data:
                fk_db = fk.get("database")
                fk_table = fk.get("fk_table")
                fk_key = fk.get("fk_key")
                if fk_db == source_db and fk_table == source_table and fk_key == source_column:
                    references.append({
                        "database": fk_db,
                        # "fk_table": fk_table,
                        # "fk_key": fk_key,
                        "constraint": fk.get("constraint"),
                        "ref_table": fk.get("ref_table"),
                        "ref_column": fk.get("ref_column"),
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
