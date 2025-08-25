#!/usr/bin/env python3
import argparse
import json
import os
import sys

def main():
    parser = argparse.ArgumentParser(
        description='Enhance columnsSource columns file with foreign key references'
    )
    parser.add_argument('--source-columns', '-sc', required=True, help='Path to columnsSource columns JSON file')
    parser.add_argument('--foreign-keys', '-fk', required=True, help='Path to foreign keys JSON file')
    parser.add_argument('--out', required=False, help='Path to output enhanced JSON file')
    args = parser.parse_args()

    columns_source_file_path = args.source_columns
    foreign_keys_file_path = args.foreign_keys

    try:
        with open(columns_source_file_path, 'r', encoding='utf-8') as f:
            columns_source_data = json.load(f)
    except Exception as e:
        print("Error reading or parsing columnsSource columns file:", e, file=sys.stderr)
        sys.exit(1)

    try:
        with open(foreign_keys_file_path, 'r', encoding='utf-8') as f:
            foreign_keys = json.load(f)
    except Exception as e:
        print("Error reading or parsing foreign keys file:", e, file=sys.stderr)
        sys.exit(1)

    enhanced_data = []
    for entry in columns_source_data:
        search_key = entry.get("match")
        if search_key:
            references = [{"database": fk["database"], "source": fk["source"]}
                          for fk in foreign_keys if fk.get("target") == search_key]
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
        print("Enhanced columnsSource columns file created:", output_file_path)
    except Exception as e:
        print("Error writing enhanced file:", e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
