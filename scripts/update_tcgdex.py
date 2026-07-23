#!/usr/bin/env python3
"""Fetch TCGdex and atomically rebuild the complete supported app catalog."""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


SOURCE_FOLDERS = {
    "data": {
        "region_id": "INTL",
        "region_name": "International",
        "series_prefix": "intl",
    },
    "data-asia": {
        "region_id": "JPN",
        "region_name": "Japanese",
        "series_prefix": "asia",
    },
}

TCGDEX_REPOSITORY_URL = "https://github.com/tcgdex/cards-database.git"
TCGDEX_ASSET_ROOT = "https://assets.tcgdex.net"
SPARSE_FOLDERS = tuple(SOURCE_FOLDERS)
EXCLUDED_SOURCE_SERIES = {"Pokémon TCG Pocket"}
SUPPORTED_LANGUAGES = {
    "data": ("en", "fr"),
    "data-asia": ("ja", "zh-CN"),
}
ASSET_LANGUAGE_CODES = {"zh-CN": "zh-cn"}
USER_AGENT = "card-manager-tcgdex-sync/2.0"

LANGUAGE_NAMES = {
    "en": "English",
    "fr": "French",
    "ja": "Japanese",
    "zh-CN": "Simplified Chinese",
}

LANGUAGE_CODE_MAP = {
    "pt": "pt-BR",
    "pt-br": "pt-BR",
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

REGIONAL_PREFIXES = ("alolan ", "galarian ", "hisuian ", "paldean ")
CARD_NAME_SUFFIX_PATTERN = re.compile(
    r"(?:\s+|-)(?:ex|gx|v|vmax|vstar|break|lv\.?\s*x|star|δ)$",
    re.IGNORECASE,
)
APPENDED_CARD_SUFFIX_PATTERN = re.compile(r"(?:VMAX|VSTAR|GX|EX|V)$")
POKEMON_OVERRIDES = {
    390: {"en": "Chimchar", "fr": "Ouisticram", "ja": "ヒコザル", "zh-CN": "小火焰猴"},
    391: {"en": "Monferno", "fr": "Chimpenfeu", "ja": "猛火猴", "zh-CN": "猛火猴"},
    862: {"en": "Obstagoon", "fr": "Ixon", "ja": "タチフサグマ", "zh-CN": "堵拦熊"},
    863: {"en": "Perrserker", "fr": "Berserkatt", "ja": "ニャイキング", "zh-CN": "喵头目"},
    864: {"en": "Cursola", "fr": "Corayôme", "ja": "サニゴーン", "zh-CN": "魔灵珊瑚"},
    865: {"en": "Sirfetch'd", "fr": "Palarticho", "ja": "ネギガナイト", "zh-CN": "葱游兵"},
    866: {"en": "Mr. Rime", "fr": "M. Glaquette", "ja": "バリコオル", "zh-CN": "踏冰人偶"},
    867: {"en": "Runerigus", "fr": "Tutétékri", "ja": "デスバーン", "zh-CN": "迭失板"},
    902: {"en": "Basculegion", "fr": "Paragruel", "ja": "イダイトウ", "zh-CN": "幽尾玄鱼"},
    903: {"en": "Sneasler", "fr": "Farfurex", "ja": "オオニューラ", "zh-CN": "大狃拉"},
    904: {"en": "Overqwil", "fr": "Qwilpik", "ja": "ハリーマン", "zh-CN": "万针鱼"},
    980: {"en": "Clodsire", "fr": "Terraiste", "ja": "ドオー", "zh-CN": "土王"},
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


def supported_localized_text(value: Any, language_ids: list[str] | tuple[str, ...]) -> dict[str, str | None]:
    """Keep only explicitly supported translations."""
    localized = normalize_localized_text(value)
    return {language_id: localized[language_id] for language_id in language_ids if language_id in localized}


def restrict_card_languages(card: dict[str, Any], language_ids: list[str]) -> None:
    """Remove unsupported localized card fields after normalization."""
    for field in ("name", "evolves_from", "rules_text", "flavor_text"):
        if isinstance(card.get(field), dict):
            card[field] = {key: value for key, value in card[field].items() if key in language_ids}
    for attack in card.get("attacks", []):
        for field in ("name", "text"):
            if isinstance(attack.get(field), dict):
                attack[field] = {key: value for key, value in attack[field].items() if key in language_ids}


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


def normalize_pokemon_name(value: str) -> str:
    """Remove card-mechanic suffixes while preserving named Pokemon forms."""
    normalized = re.sub(r"\s+", " ", value.strip())
    normalized = re.sub(r"^(?:Radiant|Shining)\s+", "", normalized, flags=re.IGNORECASE)
    normalized = APPENDED_CARD_SUFFIX_PATTERN.sub("", normalized).strip()
    while CARD_NAME_SUFFIX_PATTERN.search(normalized):
        normalized = CARD_NAME_SUFFIX_PATTERN.sub("", normalized).strip()
    return normalized


def pokemon_form_key(english_name: str) -> str:
    """Return the requested form distinction for an English Pokemon name."""
    lowered = english_name.lower()
    if lowered.startswith("m ") or lowered.startswith("mega "):
        return "mega-" + slugify(re.sub(r"^(?:m|mega)\s+", "", english_name, flags=re.IGNORECASE))
    for prefix in REGIONAL_PREFIXES:
        if lowered.startswith(prefix):
            return prefix.strip() + "-" + slugify(english_name[len(prefix):])
    return "base"


def pokemon_entry_id(pokedex_id: int, form_key: str) -> str:
    """Build a stable catalog id from a National Pokedex number and form."""
    base_id = f"{pokedex_id:04d}"
    return base_id if form_key == "base" else f"{base_id}-{form_key}"


def build_pokemon_catalog(
    source_root: Path,
) -> tuple[list[dict[str, Any]], dict[tuple[int, str, str], str], dict[tuple[str, str], set[str]]]:
    """Build the Pokemon catalog and a localized-name lookup for card conversion."""
    groups: dict[tuple[int, str], dict[str, set[str]]] = {}
    parsed_cards: list[dict[str, Any]] = []

    for source_name in SOURCE_FOLDERS:
        for path in sorted((source_root / source_name).glob("**/*.ts")):
            if not path.parent.is_dir() or path.parent == source_root / source_name:
                continue
            if any(part in EXCLUDED_SOURCE_SERIES for part in path.parts):
                continue
            try:
                card = parse_typescript_object(path)
            except ValueError:
                continue
            if normalize_enum(card.get("category")) != "pokemon":
                continue
            dex_ids = card.get("dexId") or []
            if isinstance(dex_ids, int):
                dex_ids = [dex_ids]
            if not dex_ids:
                continue
            names = {
                language_id: normalize_pokemon_name(name)
                for language_id, name in normalize_localized_text(card.get("name")).items()
                if name
            }
            if not names:
                continue
            parsed_cards.append({"dex_ids": dex_ids, "names": names})

            english_name = names.get("en", "")
            form_key = pokemon_form_key(english_name) if english_name else "base"
            for dex_id in dex_ids:
                group = groups.setdefault((int(dex_id), form_key), {})
                for language_id, name in names.items():
                    group.setdefault(language_id, set()).add(name)

    alias_lookup: dict[tuple[int, str, str], str] = {}
    name_alias_lookup: dict[tuple[str, str], set[str]] = {}
    catalog: list[dict[str, Any]] = []
    for (dex_id, form_key), names_by_language in sorted(groups.items()):
        entry_id = pokemon_entry_id(dex_id, form_key)
        names = {
            language_id: min(values, key=lambda value: (len(value), value.casefold()))
            for language_id, values in sorted(names_by_language.items())
        }
        for language_id, values in names_by_language.items():
            for value in values:
                alias_lookup[(dex_id, language_id, value.casefold())] = entry_id
                name_alias_lookup.setdefault((language_id, value.casefold()), set()).add(entry_id)
        catalog.append({
            "id": entry_id,
            "pokedex_id": dex_id,
            "name": names.get("en") or next(iter(names.values())),
            "names": names,
            "form": None if form_key == "base" else form_key.split("-", 1)[0],
        })

    base_entries = {entry["pokedex_id"]: entry for entry in catalog if entry["form"] is None}
    for dex_id, override_names in POKEMON_OVERRIDES.items():
        entry = base_entries.get(dex_id)
        if entry is None:
            entry = {"id": pokemon_entry_id(dex_id, "base"), "pokedex_id": dex_id, "form": None}
            catalog.append(entry)
        entry["name"] = override_names["en"]
        entry["names"] = override_names.copy()
        for language_id, value in override_names.items():
            alias_lookup[(dex_id, language_id, value.casefold())] = entry["id"]
            name_alias_lookup.setdefault((language_id, value.casefold()), set()).add(entry["id"])

    for entry in catalog:
        entry["names"] = {
            key: value for key, value in entry["names"].items()
            if key in LANGUAGE_NAMES
        }
        entry["name"] = entry["names"].get("en") or entry.get("name") or entry["id"]
    catalog.sort(key=lambda entry: (entry["pokedex_id"], entry["form"] is not None, entry["id"]))

    return catalog, alias_lookup, name_alias_lookup


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


def normalize_card(
    path: Path,
    set_id: str,
    language_ids: list[str],
    pokemon_aliases: dict[tuple[int, str, str], str],
    pokemon_name_aliases: dict[tuple[str, str], set[str]],
) -> dict[str, Any]:
    """Convert one upstream card file into the app card shape."""
    raw_card = parse_typescript_object(path)
    category = normalize_enum(raw_card.get("category"))
    number = path.stem
    localized_name = normalize_localized_text(raw_card.get("name"))

    dex_ids = raw_card.get("dexId") or []
    if isinstance(dex_ids, int):
        dex_ids = [dex_ids]
    pokemon_ids: list[str] = []
    if category == "pokemon":
        for dex_id in dex_ids:
            matched_id = next((
                pokemon_aliases.get((int(dex_id), language_id, normalize_pokemon_name(name).casefold()))
                for language_id, name in localized_name.items()
                if name and pokemon_aliases.get((int(dex_id), language_id, normalize_pokemon_name(name).casefold()))
            ), None)
            pokemon_ids.append(matched_id or pokemon_entry_id(int(dex_id), "base"))
        if not dex_ids:
            matched_ids = {
                entry_id
                for language_id, name in localized_name.items()
                if name
                for entry_id in pokemon_name_aliases.get(
                    (language_id, normalize_pokemon_name(name).casefold()),
                    set(),
                )
            }
            if len(matched_ids) == 1:
                pokemon_ids.extend(matched_ids)

    card: dict[str, Any] = {
        "id": f"{set_id}-{slugify(number)}",
        "set_id": set_id,
        "number": number,
        "category": category,
        "name": localized_name,
        "pokemon": list(dict.fromkeys(pokemon_ids)),
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
    if raw_card.get("description"):
        card["flavor_text"] = normalize_localized_text(raw_card.get("description"))
    if raw_card.get("legal"):
        card["legalities"] = raw_card.get("legal")

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
            tcgdex_id = set_row.get("tcgdex_id")
            names = set_row.get("name")
            language_ids = set_row.get("language_ids")

            if not isinstance(names, dict) or not any(isinstance(name, str) and name for name in names.values()):
                raise ValueError(f"Set {set_id} must have at least one localized name")
            if not isinstance(tcgdex_id, str) or not tcgdex_id:
                raise ValueError(f"Set {set_id} must have a TCGdex id")
            if "local_name" in set_row:
                raise ValueError(f"Set {set_id} still contains obsolete local_name data")
            if not isinstance(language_ids, list) or set(names.keys()) != set(language_ids):
                raise ValueError(f"Set {set_id} name languages must match language_ids")


def run_command(command: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(command, cwd=cwd, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def fetch_tcgdex(destination: Path) -> str:
    """Shallow-clone only the two TCGdex source folders used by the app."""
    run_command([
        "git", "clone", "--depth", "1", "--filter=blob:none", "--sparse",
        TCGDEX_REPOSITORY_URL, str(destination),
    ])
    run_command(["git", "sparse-checkout", "set", *SPARSE_FOLDERS], cwd=destination)
    return run_command(["git", "rev-parse", "HEAD"], cwd=destination)


def safe_filename(value: Any) -> str:
    filename = re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "unknown")).strip("-.")
    return filename or "unknown"


def asset_url(language_id: str, series_id: str, set_id: str, *names: str) -> str:
    language = ASSET_LANGUAGE_CODES.get(language_id, language_id)
    parts = (language, series_id.lower(), set_id.lower(), *names)
    return f"{TCGDEX_ASSET_ROOT}/{'/'.join(quote(part, safe='') for part in parts)}"


def download_webp(url: str, destination: Path, timeout: float) -> None:
    request = Request(url, headers={"Accept": "image/webp", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        payload = response.read()
    if len(payload) < 12 or payload[:4] != b"RIFF" or payload[8:12] != b"WEBP":
        raise ValueError("response is not WebP")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".webp.tmp")
    temporary.write_bytes(payload)
    os.replace(temporary, destination)


def sync_assets(
    data_root: Path,
    public_root: Path,
    workers: int,
    timeout: float,
) -> dict[str, int]:
    """Reuse cached assets, concurrently fetch missing ones, and update JSON URLs."""
    cards_root = public_root / "cards"
    sets_root = public_root / "sets"
    public_root.mkdir(parents=True, exist_ok=True)
    status_path = public_root / ".tcgdex-missing-assets.json"
    missing: dict[str, bool] = json.loads(status_path.read_text()) if status_path.exists() else {}
    legacy_card_status_path = cards_root / ".asset-status.json"
    legacy_card_status = (
        json.loads(legacy_card_status_path.read_text(encoding="utf-8"))
        if legacy_card_status_path.exists() else {}
    )
    tasks: dict[str, Path] = {}
    retained_sets: dict[str, set[str]] = {}

    for sets_path in data_root.glob("*/sets.json"):
        for set_row in json.loads(sets_path.read_text(encoding="utf-8")):
            set_id = str(set_row["id"])
            upstream_set = str(set_row["tcgdex_id"])
            upstream_series = str(set_row["tcgdex_series_id"])
            languages = set(set_row["language_ids"])
            retained_sets[set_id] = languages

            symbol_url = asset_url("univ", upstream_series, upstream_set, "symbol.webp")
            symbol_path = sets_root / set_id / "symbol.webp"
            if not symbol_path.exists() and symbol_url not in missing:
                tasks[symbol_url] = symbol_path

            for language_id in set_row["language_ids"]:
                logo_url = asset_url(language_id, upstream_series, upstream_set, "logo.webp")
                logo_path = sets_root / set_id / f"logo-{language_id}.webp"
                legacy_logo_path = sets_root / set_id / "logo.webp"
                if not logo_path.exists() and not legacy_logo_path.exists() and logo_url not in missing:
                    tasks[logo_url] = logo_path

            cards_path = sets_path.parent / f"cards_{set_id}.json"
            for card in json.loads(cards_path.read_text(encoding="utf-8")):
                filename = safe_filename(card.get("number"))
                for language_id in set_row["language_ids"]:
                    destination = cards_root / set_id / language_id / f"{filename}.webp"
                    url = asset_url(language_id, upstream_series, upstream_set, str(card["number"]), "high.webp")
                    legacy_key = f"{set_id}/{language_id}/{card['id']}"
                    if legacy_key in legacy_card_status and legacy_card_status[legacy_key] is None:
                        missing[url] = True
                    if not destination.exists() and url not in missing:
                        tasks[url] = destination

    downloaded = unavailable = failures = 0
    if tasks:
        with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
            futures = {
                executor.submit(download_webp, url, destination, timeout): url
                for url, destination in tasks.items()
            }
            for future in as_completed(futures):
                url = futures[future]
                try:
                    future.result()
                    downloaded += 1
                except HTTPError as error:
                    if error.code == 404:
                        missing[url] = True
                        unavailable += 1
                    else:
                        failures += 1
                        print(f"Asset request failed ({error.code}): {url}", file=sys.stderr)
                except (URLError, TimeoutError, OSError, ValueError) as error:
                    failures += 1
                    print(f"Asset request failed: {url}: {error}", file=sys.stderr)

    referenced = 0
    for sets_path in data_root.glob("*/sets.json"):
        sets = json.loads(sets_path.read_text(encoding="utf-8"))
        for set_row in sets:
            set_id = str(set_row["id"])
            symbol_path = sets_root / set_id / "symbol.webp"
            set_row["symbol_image_url"] = f"/images/sets/{set_id}/symbol.webp" if symbol_path.exists() else None
            logo_path = next((
                sets_root / set_id / f"logo-{language_id}.webp"
                for language_id in set_row["language_ids"]
                if (sets_root / set_id / f"logo-{language_id}.webp").exists()
            ), None) or (
                sets_root / set_id / "logo.webp"
                if (sets_root / set_id / "logo.webp").exists() else None
            )
            set_row["title_image_url"] = f"/images/sets/{set_id}/{logo_path.name}" if logo_path else None

            cards_path = sets_path.parent / f"cards_{set_id}.json"
            cards = json.loads(cards_path.read_text(encoding="utf-8"))
            for card in cards:
                filename = safe_filename(card.get("number"))
                for variant in card["variants"]:
                    for language_id in set_row["language_ids"]:
                        path = cards_root / set_id / language_id / f"{filename}.webp"
                        variant["images"][language_id] = (
                            f"/images/cards/{set_id}/{language_id}/{filename}.webp"
                            if path.exists() else ""
                        )
                        referenced += path.exists()
            write_json(cards_path, cards)
        write_json(sets_path, sets)

    for set_path in cards_root.iterdir() if cards_root.exists() else []:
        if not set_path.is_dir():
            continue
        if set_path.name not in retained_sets:
            shutil.rmtree(set_path)
            continue
        for language_path in set_path.iterdir():
            if language_path.is_dir() and language_path.name not in retained_sets[set_path.name]:
                shutil.rmtree(language_path)
    for set_path in sets_root.iterdir() if sets_root.exists() else []:
        if set_path.is_dir() and set_path.name not in retained_sets:
            shutil.rmtree(set_path)

    write_json(status_path, missing)
    return {
        "candidates": len(tasks),
        "downloaded": downloaded,
        "unavailable": unavailable,
        "failures": failures,
        "referenced": referenced,
    }


def convert_source_folder(
    source_root: Path,
    source_name: str,
    output_root: Path,
    pokemon_aliases: dict[tuple[int, str, str], str],
    pokemon_name_aliases: dict[tuple[str, str], set[str]],
) -> tuple[list[dict[str, Any]], list[str]]:
    """Convert one TCGdex source folder into per-series app data."""
    source_config = SOURCE_FOLDERS[source_name]
    supported_languages = SUPPORTED_LANGUAGES[source_name]
    source_path = source_root / source_name
    series_rows: list[dict[str, Any]] = []
    language_ids_seen: set[str] = set()

    for series_file in sorted(source_path.glob("*.ts")):
        series_name = series_file.stem
        if series_name in EXCLUDED_SOURCE_SERIES:
            continue
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
            localized_names = supported_localized_text(raw_set.get("name"), supported_languages)
            if not any(localized_names.values()):
                continue
            language_ids = [language for language in supported_languages if language in localized_names]
            language_ids_seen.update(language_ids)

            cards = []
            for card_file in sorted(set_folder.glob("*.ts"), key=lambda path: path.stem):
                card = normalize_card(card_file, set_id, language_ids, pokemon_aliases, pokemon_name_aliases)
                restrict_card_languages(card, language_ids)
                cards.append(card)

            card_count = sum(len(card["variants"]) for card in cards)
            release_date = release_date_value(raw_set.get("releaseDate"))
            if release_date and (not earliest_release_date or release_date < earliest_release_date):
                earliest_release_date = release_date

            sets.append({
                "id": set_id,
                "tcgdex_id": str(raw_set.get("id") or set_file.stem),
                "tcgdex_series_id": raw_series_id,
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", help="Use an existing TCGdex checkout instead of fetching it.")
    parser.add_argument("--output", default="app/data", help="Destination app data folder.")
    parser.add_argument("--public", default="app/public/images", help="Destination image cache.")
    parser.add_argument("--workers", type=int, default=8, help="Concurrent missing-image downloads.")
    parser.add_argument("--timeout", type=float, default=30.0, help="Per-image request timeout.")
    parser.add_argument("--no-images", action="store_true", help="Rebuild JSON without fetching images.")
    return parser.parse_args()


def build_catalog(args: argparse.Namespace, source_root: Path, commit_sha: str) -> int:
    project_root = Path(__file__).resolve().parents[1]
    output_root = (project_root / args.output).resolve()
    public_root = (project_root / args.public).resolve()
    staging_root = output_root.with_name(f"{output_root.name}.tmp")

    if not source_root.exists():
        print(f"Missing source folder: {source_root}", file=sys.stderr)
        return 1

    if staging_root.exists():
        shutil.rmtree(staging_root)
    staging_root.mkdir(parents=True)

    pokemon_catalog, pokemon_aliases, pokemon_name_aliases = build_pokemon_catalog(source_root)
    all_series: list[dict[str, Any]] = []
    all_language_ids: set[str] = set()

    for source_name in SOURCE_FOLDERS:
        series_rows, language_ids = convert_source_folder(
            source_root,
            source_name,
            staging_root,
            pokemon_aliases,
            pokemon_name_aliases,
        )
        all_series.extend(series_rows)
        all_language_ids.update(language_ids)

    regions = [
        {"id": "INTL", "name": "International"},
        {"id": "JPN", "name": "Japanese"},
        {"id": "CHN", "name": "Chinese"},
    ]
    languages = [
        {"id": language_id, "name": LANGUAGE_NAMES.get(language_id, language_id)}
        for language_id in sorted(all_language_ids)
    ]

    write_json(staging_root / "regions.json", regions)
    write_json(staging_root / "languages.json", languages)
    write_json(staging_root / "series.json", sorted(all_series, key=lambda row: (row["region_id"], row["start_date"], row["name"])))
    write_json(staging_root / "pokemon.json", pokemon_catalog)
    write_json(staging_root / "tcgdex-source.json", {"commit": commit_sha})
    validate_generated_sets(staging_root)

    asset_result = {"candidates": 0, "downloaded": 0, "unavailable": 0, "failures": 0, "referenced": 0}
    if not args.no_images:
        asset_result = sync_assets(staging_root, public_root, args.workers, args.timeout)

    if output_root.exists():
        shutil.rmtree(output_root)
    staging_root.rename(output_root)

    card_file_count = len(list(output_root.glob("*/cards_*.json")))
    print(f"Converted {len(all_series)} series")
    print(f"Converted {card_file_count} set card files")
    print(f"Generated {len(pokemon_catalog)} Pokemon entries")
    print(f"TCGdex commit: {commit_sha}")
    print(f"Image sync: {json.dumps(asset_result, sort_keys=True)}")
    print(f"Wrote app data to {output_root}")
    return 1 if asset_result["failures"] else 0


def main() -> int:
    """Fetch TCGdex once, build the scoped catalog, and cache available images."""
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    if args.source:
        source_root = (project_root / args.source).resolve()
        commit_sha = run_command(["git", "rev-parse", "HEAD"], cwd=source_root) if (source_root / ".git").exists() else "local"
        return build_catalog(args, source_root, commit_sha)

    with tempfile.TemporaryDirectory(prefix="card-manager-tcgdex-") as temporary:
        source_root = Path(temporary) / "cards-database"
        print("Fetching TCGdex card database...")
        commit_sha = fetch_tcgdex(source_root)
        return build_catalog(args, source_root, commit_sha)


if __name__ == "__main__":
    raise SystemExit(main())
