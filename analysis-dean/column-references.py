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

    columns_source_file_path = args.source_columns
    foreign_keys_file_path = args.foreign_keys

    logging.info("Loading source columns file: %s", columns_source_file_path)
    columns_source_data = load_json_file(columns_source_file_path)

    logging.info("Loading foreign keys file: %s", foreign_keys_file_path)
    foreign_keys = load_json_file(foreign_keys_file_path)

    enhanced_data = []
    for entry in columns_source_data:
        search_key = entry.get("match")
        if search_key:
            references = [{"database": fk["database"], "source": fk["source"]}
                          for fk in foreign_keys if fk.get("target") == search_key]
            logging.debug("Found references for match '%s': %s", search_key, references)
        else:
            references = []
        new_entry = dict(entry)
        new_entry["references"] = references
        enhanced_data.append(new_entry)

    if args.out:
        output_file_path = args.out
    else:
        base, ext = os.path.splitext(columns_source_file_path)
        output_file_path = base + "-enhanced" + ext

    try:
        with open(output_file_path, 'w', encoding='utf-8') as f:
            json.dump(enhanced_data, f, indent=4)
        logging.info("Enhanced columnsSource columns file created: %s", output_file_path)
    except Exception as e:
        logging.error("Error writing enhanced file: %s", e)
        sys.exit(1)

if __name__ == '__main__':
    main()
