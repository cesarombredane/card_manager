#!/usr/bin/env python3
"""Convert raw TCGdex TypeScript data into the app JSON format."""

from __future__ import annotations

import argparse
import ast
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any


SOURCE_FOLDERS = {
    "data": {
        "region_id": "INTL",
        "region_name": "International",
        "series_prefix": "intl",
    },
    "data-asia": {
        "region_id": "ASIA",
        "region_name": "Asia",
        "series_prefix": "asia",
    },
}

LANGUAGE_NAMES = {
    "de": "German",
    "en": "English",
    "es": "Spanish",
    "es-mx": "Spanish (Mexico)",
    "fr": "French",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "nl": "Dutch",
    "pl": "Polish",
    "pt-BR": "Portuguese",
    "ru": "Russian",
    "th": "Thai",
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
}

LANGUAGE_CODE_MAP = {
    "pt": "pt-BR",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
}

ENERGY_MAP = {
    "colorless": "normal",
    "darkness": "dark",
    "electric": "lightning",
}

VARIANT_MAP = {
    "1st": "first_edition",
    "first": "first_edition",
    "firstedition": "first_edition",
    "holo": "holo",
    "normal": "normal",
    "pokeball": "poke_ball",
    "poke_ball": "poke_ball",
    "reverse": "reverse_holo",
    "reverseholo": "reverse_holo",
    "standard": "normal",
    "unlimited": "unlimited",
}


def strip_comments(source: str) -> str:
    """Remove JavaScript comments while preserving quoted strings."""
    output: list[str] = []
    index = 0
    quote: str | None = None
    escaped = False

    while index < len(source):
        char = source[index]
        next_char = source[index + 1] if index + 1 < len(source) else ""

        if quote:
            output.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            index += 1
            continue

        if char in ("'", '"'):
            quote = char
            output.append(char)
            index += 1
            continue

        if char == "/" and next_char == "/":
            index += 2
            while index < len(source) and source[index] != "\n":
                index += 1
            continue

        if char == "/" and next_char == "*":
            index += 2
            while index + 1 < len(source) and not (source[index] == "*" and source[index + 1] == "/"):
                index += 1
            index += 2
            continue

        output.append(char)
        index += 1

    return "".join(output)


def extract_object_literal(source: str) -> str:
    """Extract the first object literal assigned in a TypeScript data file."""
    start = source.find("{", source.find("const "))
    if start == -1:
        raise ValueError("No object literal found")

    depth = 0
    quote: str | None = None
    escaped = False

    for index in range(start, len(source)):
        char = source[index]

        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue

        if char in ("'", '"'):
            quote = char
            continue

        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start:index + 1]

    raise ValueError("Unclosed object literal")


def normalize_strings(source: str) -> str:
    """Convert single and double quoted JavaScript strings to JSON strings."""
    output: list[str] = []
    index = 0

    while index < len(source):
        char = source[index]
        if char not in ("'", '"'):
            output.append(char)
            index += 1
            continue

        quote = char
        start = index
        index += 1
        escaped = False

        while index < len(source):
            current = source[index]
            if escaped:
                escaped = False
            elif current == "\\":
                escaped = True
            elif current == quote:
                index += 1
                break
            index += 1

        raw_string = source[start:index]
        try:
            value = ast.literal_eval(raw_string)
        except (SyntaxError, ValueError):
            value = raw_string[1:-1]

        output.append(json.dumps(value, ensure_ascii=False))

    return "".join(output)


def collapse_string_concatenation(source: str) -> str:
    """Collapse simple JavaScript string concatenations into one JSON string."""
    string_pattern = r'"(?:\\.|[^"\\])*"'
    concat_pattern = re.compile(rf"({string_pattern})\s*\+\s*({string_pattern})")

    while True:
        match = concat_pattern.search(source)
        if not match:
            return source

        merged = json.dumps(json.loads(match.group(1)) + json.loads(match.group(2)), ensure_ascii=False)
        source = source[:match.start()] + merged + source[match.end():]


def protect_json_strings(source: str) -> tuple[str, list[str]]:
    """Replace JSON string literals with placeholders during regex cleanup."""
    output: list[str] = []
    strings: list[str] = []
    index = 0

    while index < len(source):
        char = source[index]
        if char != '"':
            output.append(char)
            index += 1
            continue

        start = index
        index += 1
        escaped = False

        while index < len(source):
            current = source[index]
            if escaped:
                escaped = False
            elif current == "\\":
                escaped = True
            elif current == '"':
                index += 1
                break
            index += 1

        placeholder = f"§STRING_{len(strings)}§"
        strings.append(source[start:index])
        output.append(placeholder)

    return "".join(output), strings


def restore_json_strings(source: str, strings: list[str]) -> str:
    """Restore protected JSON string literals."""
    for index, value in enumerate(strings):
        source = source.replace(f"§STRING_{index}§", value)
    return source


def parse_typescript_object(path: Path) -> dict[str, Any]:
    """Parse a simple TCGdex TypeScript object literal into a Python dict."""
    source = strip_comments(path.read_text(encoding="utf-8"))
    literal = normalize_strings(extract_object_literal(source))
    literal = collapse_string_concatenation(literal)
    literal, strings = protect_json_strings(literal)
    literal = re.sub(r"([{\[,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:", r'\1"\2":', literal)
    literal = re.sub(
        r":\s*([A-Za-z_$][A-Za-z0-9_$]*)\b",
        lambda match: f": {match.group(1)}" if match.group(1) in {"true", "false", "null"} else f': "{match.group(1)}"',
        literal,
    )
    literal = restore_json_strings(literal, strings)
    literal = re.sub(r"([}\]])(\s+)(\"[A-Za-z_$][A-Za-z0-9_$]*\"\s*:)", r"\1,\2\3", literal)
    literal = re.sub(r",\s*([}\]])", r"\1", literal)

    try:
        return json.loads(literal)
    except json.JSONDecodeError as error:
        raise ValueError(f"Could not parse {path}: {error}") from error


def normalize_language_code(language_code: str) -> str:
    """Normalize upstream language codes to the app language ids."""
    return LANGUAGE_CODE_MAP.get(language_code, language_code)


def normalize_localized_text(value: Any) -> dict[str, str | None]:
    """Normalize a localized upstream object into app localized text."""
    if isinstance(value, str):
        return {"en": value}

    if not isinstance(value, dict):
        return {}

    return {
        normalize_language_code(str(language_code)): text
        for language_code, text in value.items()
        if text is None or isinstance(text, str)
    }


def first_localized_value(value: Any, preferred_language: str = "en") -> str | None:
    """Return a useful display value from a localized upstream field."""
    localized = normalize_localized_text(value)
    return localized.get(preferred_language) or next((item for item in localized.values() if item), None)


def slugify(value: str) -> str:
    """Create a readable id fragment for folders and generated ids."""
    value = value.strip().lower().replace("&", "and")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unknown"


def normalize_enum(value: Any) -> str:
    """Normalize display enum values into lowercase snake-ish ids."""
    return str(value or "unknown").strip().lower().replace(" ", "_").replace("-", "_")


def normalize_energy(value: Any) -> str:
    """Normalize upstream energy/type names into app values."""
    normalized = normalize_enum(value)
    return ENERGY_MAP.get(normalized, normalized)


def normalize_modifier(modifier: dict[str, Any]) -> dict[str, str]:
    """Normalize weakness or resistance modifiers."""
    return {
        "type": normalize_energy(modifier.get("type")),
        "value": str(modifier.get("value", "")).replace("×", "x"),
    }


def normalize_variant_id(variant: Any) -> str:
    """Normalize an upstream variant object or key into an app variant id."""
    if isinstance(variant, str):
        return VARIANT_MAP.get(normalize_enum(variant), normalize_enum(variant))

    if not isinstance(variant, dict):
        return "normal"

    foil = normalize_enum(variant.get("foil")) if variant.get("foil") else ""
    stamp = variant.get("stamp")
    variant_type = normalize_enum(variant.get("type"))

    if foil in {"masterball", "master_ball"}:
        return "master_ball"
    if foil in {"pokeball", "poke_ball"}:
        return "poke_ball"
    if stamp:
        return "stamped"

    return VARIANT_MAP.get(variant_type, variant_type or "normal")


def normalize_variants(card: dict[str, Any], language_ids: list[str]) -> list[dict[str, Any]]:
    """Convert upstream variant data into the app variant list."""
    variants = card.get("variants")
    variant_ids: list[str] = []

    if isinstance(variants, list):
        variant_ids = [normalize_variant_id(variant) for variant in variants]
    elif isinstance(variants, dict):
        variant_ids = [
            normalize_variant_id(variant_key)
            for variant_key, enabled in variants.items()
            if enabled
        ]

    if not variant_ids:
        variant_ids = ["normal"]

    unique_variant_ids = list(dict.fromkeys(variant_ids))
    return [
        {
            "id": variant_id,
            "images": {language_id: "" for language_id in language_ids},
        }
        for variant_id in unique_variant_ids
    ]


def normalize_attack(attack: dict[str, Any]) -> dict[str, Any]:
    """Convert an upstream attack into the app attack shape."""
    return {
        "name": normalize_localized_text(attack.get("name")),
        "cost": [normalize_energy(cost) for cost in attack.get("cost", [])],
        "damage": str(attack.get("damage", "")),
        "text": normalize_localized_text(attack.get("effect") or attack.get("text")),
    }


def normalize_card(path: Path, set_id: str, language_ids: list[str]) -> dict[str, Any]:
    """Convert one upstream card file into the app card shape."""
    raw_card = parse_typescript_object(path)
    category = normalize_enum(raw_card.get("category"))
    number = path.stem
    localized_name = normalize_localized_text(raw_card.get("name"))

    card: dict[str, Any] = {
        "id": f"{set_id}-{slugify(number)}",
        "set_id": set_id,
        "number": number,
        "category": category,
        "name": localized_name,
        "pokemon": [first_localized_value(raw_card.get("name"))] if category == "pokemon" and first_localized_value(raw_card.get("name")) else [],
        "illustrator": raw_card.get("illustrator"),
        "rarity": normalize_enum(raw_card.get("rarity")),
        "regulation_mark": raw_card.get("regulationMark"),
        "variants": normalize_variants(raw_card, language_ids),
    }

    if raw_card.get("hp") is not None:
        card["hp"] = raw_card.get("hp")
    if raw_card.get("types"):
        card["types"] = [normalize_energy(value) for value in raw_card.get("types", [])]
    if raw_card.get("stage"):
        card["stage"] = normalize_enum(raw_card.get("stage"))
    if raw_card.get("evolveFrom"):
        card["evolves_from"] = normalize_localized_text(raw_card.get("evolveFrom"))
    if raw_card.get("suffix"):
        card["rule_box"] = str(raw_card.get("suffix"))
    if raw_card.get("attacks"):
        card["attacks"] = [normalize_attack(attack) for attack in raw_card.get("attacks", [])]
    if raw_card.get("weaknesses"):
        card["weaknesses"] = [normalize_modifier(modifier) for modifier in raw_card.get("weaknesses", [])]
    if raw_card.get("resistances"):
        card["resistances"] = [normalize_modifier(modifier) for modifier in raw_card.get("resistances", [])]
    if raw_card.get("retreat") is not None:
        card["retreat_cost"] = raw_card.get("retreat")
    if raw_card.get("trainerType"):
        card["trainer_type"] = normalize_enum(raw_card.get("trainerType"))
    if raw_card.get("effect"):
        card["rules_text"] = normalize_localized_text(raw_card.get("effect"))

    return card


def release_date_value(value: Any) -> str:
    """Return one release date from either a string or localized date object."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return min((str(item) for item in value.values() if item), default="")
    return ""


def write_json(path: Path, value: Any) -> None:
    """Write pretty JSON with stable formatting."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate_generated_sets(output_root: Path) -> None:
    """Validate the localized set-name contract before publishing generated data."""
    for sets_path in output_root.glob("*/sets.json"):
        sets = json.loads(sets_path.read_text(encoding="utf-8"))
        for set_row in sets:
            set_id = str(set_row.get("id") or "unknown")
            names = set_row.get("name")
            language_ids = set_row.get("language_ids")

            if not isinstance(names, dict) or not any(isinstance(name, str) and name for name in names.values()):
                raise ValueError(f"Set {set_id} must have at least one localized name")
            if "local_name" in set_row:
                raise ValueError(f"Set {set_id} still contains obsolete local_name data")
            if not isinstance(language_ids, list) or set(names.keys()) != set(language_ids):
                raise ValueError(f"Set {set_id} name languages must match language_ids")


def convert_source_folder(source_root: Path, source_name: str, output_root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    """Convert one TCGdex source folder into per-series app data."""
    source_config = SOURCE_FOLDERS[source_name]
    source_path = source_root / source_name
    series_rows: list[dict[str, Any]] = []
    language_ids_seen: set[str] = set()

    for series_file in sorted(source_path.glob("*.ts")):
        series_name = series_file.stem
        series_folder = source_path / series_name
        if not series_folder.is_dir():
            continue

        raw_series = parse_typescript_object(series_file)
        raw_series_id = str(raw_series.get("id") or series_name)
        series_id = f"{source_config['series_prefix']}-{slugify(raw_series_id)}"
        sets: list[dict[str, Any]] = []
        earliest_release_date = ""

        for set_file in sorted(series_folder.glob("*.ts")):
            set_folder = series_folder / set_file.stem
            if not set_folder.is_dir():
                continue

            raw_set = parse_typescript_object(set_file)
            set_id = f"{source_config['series_prefix']}-{slugify(str(raw_set.get('id') or set_file.stem))}"
            localized_names = normalize_localized_text(raw_set.get("name"))
            if not any(localized_names.values()):
                raise ValueError(f"Set {set_id} has no localized name")
            language_ids = sorted(localized_names.keys())
            language_ids_seen.update(language_ids)

            cards = [
                normalize_card(card_file, set_id, language_ids)
                for card_file in sorted(set_folder.glob("*.ts"), key=lambda path: path.stem)
            ]

            card_count = sum(len(card["variants"]) for card in cards)
            release_date = release_date_value(raw_set.get("releaseDate"))
            if release_date and (not earliest_release_date or release_date < earliest_release_date):
                earliest_release_date = release_date

            sets.append({
                "id": set_id,
                "series_id": series_id,
                "name": localized_names,
                "title_image_url": None,
                "symbol_image_url": None,
                "release_date": release_date,
                "card_count": card_count,
                "language_ids": language_ids,
            })

            write_json(output_root / series_id / f"cards_{set_id}.json", cards)

        if sets:
            series_rows.append({
                "id": series_id,
                "region_id": source_config["region_id"],
                "name": first_localized_value(raw_series.get("name")) or series_name,
                "start_date": earliest_release_date,
            })
            write_json(output_root / series_id / "sets.json", sets)

    return series_rows, sorted(language_ids_seen)


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Convert tcgdex_data into the app JSON data format.")
    parser.add_argument("--source", default="tcgdex_data", help="Raw TCGdex data folder.")
    parser.add_argument("--output", default="app/data", help="Destination app data folder.")
    return parser.parse_args()


def main() -> int:
    """Convert all configured TCGdex source folders."""
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    source_root = (project_root / args.source).resolve()
    output_root = (project_root / args.output).resolve()
    staging_root = output_root.with_name(f"{output_root.name}.tmp")

    if not source_root.exists():
        print(f"Missing source folder: {source_root}", file=sys.stderr)
        return 1

    if staging_root.exists():
        shutil.rmtree(staging_root)
    staging_root.mkdir(parents=True)

    all_series: list[dict[str, Any]] = []
    all_language_ids: set[str] = set()

    for source_name in SOURCE_FOLDERS:
        series_rows, language_ids = convert_source_folder(source_root, source_name, staging_root)
        all_series.extend(series_rows)
        all_language_ids.update(language_ids)

    regions = [
        {"id": source_config["region_id"], "name": source_config["region_name"]}
        for source_config in SOURCE_FOLDERS.values()
    ]
    languages = [
        {"id": language_id, "name": LANGUAGE_NAMES.get(language_id, language_id)}
        for language_id in sorted(all_language_ids)
    ]

    write_json(staging_root / "regions.json", regions)
    write_json(staging_root / "languages.json", languages)
    write_json(staging_root / "series.json", sorted(all_series, key=lambda row: (row["region_id"], row["start_date"], row["name"])))
    validate_generated_sets(staging_root)

    if output_root.exists():
        shutil.rmtree(output_root)
    staging_root.rename(output_root)

    card_file_count = len(list(output_root.glob("*/cards_*.json")))
    print(f"Converted {len(all_series)} series")
    print(f"Converted {card_file_count} set card files")
    print(f"Wrote app data to {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
