import csv
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5


ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = ROOT / "csv"
SOURCE_ID = "00000000-0000-4000-8000-000000000202"


LANGUAGES = [
    ("en", "English", "English", "active", "INTL"),
    ("ja", "Japanese", "日本語", "active", "JP"),
    ("fr", "French", "Français", "active", "INTL"),
    ("de", "German", "Deutsch", "active", "INTL"),
    ("it", "Italian", "Italiano", "active", "INTL"),
    ("es", "Spanish", "Español", "active", "INTL"),
    ("pt-BR", "Portuguese", "Português", "active", "INTL"),
    ("ko", "Korean", "한국어", "active", "KR"),
    ("zh-TW", "Traditional Chinese", "繁體中文", "active", "TW"),
    ("zh-CN", "Simplified Chinese", "简体中文", "active", "CN"),
    ("th", "Thai", "ไทย", "active", "TH"),
    ("id", "Indonesian", "Bahasa Indonesia", "active", "ID"),
    ("nl", "Dutch", "Nederlands", "former", "INTL"),
    ("pl", "Polish", "Polski", "former", "INTL"),
    ("ru", "Russian", "Русский", "former", "INTL"),
]

REGIONS = [
    ("JP", "Japan"),
    ("INTL", "International"),
    ("KR", "Korea"),
    ("CN", "Mainland China"),
    ("TW", "Taiwan"),
    ("HK", "Hong Kong"),
    ("TH", "Thailand"),
    ("ID", "Indonesia"),
]

SERIES_TEMPLATES = [
    ("classic", "Classic Collection", "1999-01-09", "2002-10-12"),
    ("modern", "Modern Collection", "2017-02-03", "2022-11-11"),
    ("scarlet", "Scarlet & Violet Collection", "2023-03-31", ""),
]

SET_TEMPLATES = [
    ("base", "classic", "Base Set", "BS", 102, 0, "1999-01-09", "main"),
    ("jungle", "classic", "Jungle", "JU", 64, 0, "1999-06-16", "main"),
    ("fossil", "classic", "Fossil", "FO", 62, 0, "1999-10-10", "main"),
    ("rocket", "classic", "Team Rocket", "TR", 82, 0, "2000-04-24", "main"),
    ("sun-moon", "modern", "Sun & Moon", "SM1", 149, 14, "2017-02-03", "main"),
    ("sword-shield", "modern", "Sword & Shield", "SWSH1", 202, 14, "2020-02-07", "main"),
    ("vivid-voltage", "modern", "Vivid Voltage", "VIV", 185, 18, "2020-11-13", "main"),
    ("pokemon-go", "modern", "Pokemon GO", "PGO", 78, 10, "2022-07-01", "special"),
    ("scarlet-violet", "scarlet", "Scarlet & Violet", "SVI", 198, 60, "2023-03-31", "main"),
    ("paldea-evolved", "scarlet", "Paldea Evolved", "PAL", 193, 86, "2023-06-09", "main"),
]

CARDS = [
    {
        "slug": "charizard",
        "name": "Charizard",
        "category": "pokemon",
        "artist": "Mitsuhiro Arita",
        "type": "Fire",
        "hp": 170,
        "stage": "Stage 2",
        "evolves_from": "Charmeleon",
        "rarity": "Rare Holo",
        "image": "https://images.pokemontcg.io/base1/4_hires.png",
        "attack": ("Fire Spin", ["Fire", "Fire", "Fire", "Colorless"], "100", "Discard 2 Energy attached to this Pokemon."),
        "flavor": "Spits fire hot enough to melt boulders.",
    },
    {
        "slug": "blastoise",
        "name": "Blastoise",
        "category": "pokemon",
        "artist": "Ken Sugimori",
        "type": "Water",
        "hp": 100,
        "stage": "Stage 2",
        "evolves_from": "Wartortle",
        "rarity": "Rare Holo",
        "image": "https://images.pokemontcg.io/base1/2_hires.png",
        "attack": ("Hydro Pump", ["Water", "Water", "Water"], "40+", "Does more damage for each Water Energy attached."),
        "flavor": "Crushes foes with high-pressure water cannons.",
    },
    {
        "slug": "venusaur",
        "name": "Venusaur",
        "category": "pokemon",
        "artist": "Hitoshi Ariga",
        "type": "Grass",
        "hp": 100,
        "stage": "Stage 2",
        "evolves_from": "Ivysaur",
        "rarity": "Rare Holo",
        "image": "https://images.pokemontcg.io/base1/15_hires.png",
        "attack": ("Solarbeam", ["Grass", "Grass", "Grass", "Grass"], "60", ""),
        "flavor": "The plant blooms when absorbing sunlight.",
    },
    {
        "slug": "mewtwo",
        "name": "Mewtwo",
        "category": "pokemon",
        "artist": "Kouki Saitou",
        "type": "Psychic",
        "hp": 60,
        "stage": "Basic",
        "evolves_from": "",
        "rarity": "Rare Holo",
        "image": "https://images.pokemontcg.io/base1/10_hires.png",
        "attack": ("Psychic", ["Psychic", "Colorless"], "10+", "Does more damage for each Energy on the opponent."),
        "flavor": "A Pokemon created by recombining genes.",
    },
    {
        "slug": "gyarados",
        "name": "Gyarados",
        "category": "pokemon",
        "artist": "Shinji Kanda",
        "type": "Water",
        "hp": 100,
        "stage": "Stage 1",
        "evolves_from": "Magikarp",
        "rarity": "Rare Holo",
        "image": "https://images.pokemontcg.io/base1/6_hires.png",
        "attack": ("Dragon Rage", ["Water", "Water", "Water"], "50", ""),
        "flavor": "Rarely seen in the wild but feared for its rage.",
    },
    {
        "slug": "pikachu",
        "name": "Pikachu",
        "category": "pokemon",
        "artist": "Atsuko Nishida",
        "type": "Lightning",
        "hp": 40,
        "stage": "Basic",
        "evolves_from": "",
        "rarity": "Common",
        "image": "https://images.pokemontcg.io/base1/58_hires.png",
        "attack": ("Thunder Jolt", ["Lightning"], "30", "Flip a coin. If tails, this Pokemon damages itself."),
        "flavor": "When it stores electricity, its tail glows.",
    },
    {
        "slug": "eevee",
        "name": "Eevee",
        "category": "pokemon",
        "artist": "Kagemaru Himeno",
        "type": "Colorless",
        "hp": 60,
        "stage": "Basic",
        "evolves_from": "",
        "rarity": "Common",
        "image": "https://images.pokemontcg.io/pgo/48_hires.png",
        "attack": ("Quick Attack", ["Colorless", "Colorless"], "10+", "Flip a coin. If heads, this attack does more damage."),
        "flavor": "Its genetic code may mutate when exposed to stones.",
    },
    {
        "slug": "dragonite",
        "name": "Dragonite",
        "category": "pokemon",
        "artist": "Naoki Saito",
        "type": "Dragon",
        "hp": 160,
        "stage": "Stage 2",
        "evolves_from": "Dragonair",
        "rarity": "Rare Holo",
        "image": "https://images.pokemontcg.io/pgo/50_hires.png",
        "attack": ("Dragon Gale", ["Water", "Lightning", "Colorless"], "130", "This attack also damages your Bench."),
        "flavor": "Capable of circling the globe in sixteen hours.",
    },
    {
        "slug": "gengar",
        "name": "Gengar",
        "category": "pokemon",
        "artist": "Keiji Kinebuchi",
        "type": "Psychic",
        "hp": 120,
        "stage": "Stage 2",
        "evolves_from": "Haunter",
        "rarity": "Rare",
        "image": "https://images.pokemontcg.io/swsh4/56_hires.png",
        "attack": ("Shadow Room", ["Psychic", "Colorless"], "60", "Place damage counters on one of your opponent's Pokemon."),
        "flavor": "It hides in shadows and steals heat.",
    },
    {
        "slug": "professors-research",
        "name": "Professor's Research",
        "category": "trainer",
        "artist": "Yusuke Ohmura",
        "type": "",
        "hp": "",
        "stage": "",
        "evolves_from": "",
        "rarity": "Uncommon",
        "image": "https://images.pokemontcg.io/sv1/190_hires.png",
        "attack": ("", [], "", ""),
        "flavor": "",
        "rules": "Discard your hand and draw 7 cards.",
    },
    {
        "slug": "mimikyu",
        "name": "Mimikyu",
        "category": "pokemon",
        "artist": "Megumi Mizutani",
        "type": "Psychic",
        "hp": 70,
        "stage": "Basic",
        "evolves_from": "",
        "rarity": "Rare",
        "image": "https://images.pokemontcg.io/sv1/97_hires.png",
        "attack": ("Haunt", ["Psychic"], "20", "Move a damage counter from this Pokemon to one of your opponent's Pokemon."),
        "flavor": "It wears a ragged head cover to look like Pikachu.",
    },
]

LOCAL_NAMES = {
    "ja": {"Charizard": "リザードン", "Blastoise": "カメックス", "Venusaur": "フシギバナ", "Mewtwo": "ミュウツー", "Gyarados": "ギャラドス", "Pikachu": "ピカチュウ", "Eevee": "イーブイ", "Dragonite": "カイリュー", "Gengar": "ゲンガー", "Professor's Research": "博士の研究"},
    "fr": {"Charizard": "Dracaufeu", "Blastoise": "Tortank", "Venusaur": "Florizarre", "Mewtwo": "Mewtwo", "Gyarados": "Léviator", "Pikachu": "Pikachu", "Eevee": "Évoli", "Dragonite": "Dracolosse", "Gengar": "Ectoplasma", "Professor's Research": "Recherches Professorales"},
    "de": {"Charizard": "Glurak", "Blastoise": "Turtok", "Venusaur": "Bisaflor", "Mewtwo": "Mewtu", "Gyarados": "Garados", "Pikachu": "Pikachu", "Eevee": "Evoli", "Dragonite": "Dragoran", "Gengar": "Gengar", "Professor's Research": "Forschung des Professors"},
    "it": {"Charizard": "Charizard", "Blastoise": "Blastoise", "Venusaur": "Venusaur", "Mewtwo": "Mewtwo", "Gyarados": "Gyarados", "Pikachu": "Pikachu", "Eevee": "Eevee", "Dragonite": "Dragonite", "Gengar": "Gengar", "Professor's Research": "Ricerca Accademica"},
    "es": {"Charizard": "Charizard", "Blastoise": "Blastoise", "Venusaur": "Venusaur", "Mewtwo": "Mewtwo", "Gyarados": "Gyarados", "Pikachu": "Pikachu", "Eevee": "Eevee", "Dragonite": "Dragonite", "Gengar": "Gengar", "Professor's Research": "Investigación de Profesores"},
    "ko": {"Charizard": "리자몽", "Blastoise": "거북왕", "Venusaur": "이상해꽃", "Mewtwo": "뮤츠", "Gyarados": "갸라도스", "Pikachu": "피카츄", "Eevee": "이브이", "Dragonite": "망나뇽", "Gengar": "팬텀", "Professor's Research": "박사의 연구"},
    "zh-CN": {"Charizard": "喷火龙", "Blastoise": "水箭龟", "Venusaur": "妙蛙花", "Mewtwo": "超梦", "Gyarados": "暴鲤龙", "Pikachu": "皮卡丘", "Eevee": "伊布", "Dragonite": "快龙", "Gengar": "耿鬼", "Professor's Research": "博士的研究"},
    "zh-TW": {"Charizard": "噴火龍", "Blastoise": "水箭龜", "Venusaur": "妙蛙花", "Mewtwo": "超夢", "Gyarados": "暴鯉龍", "Pikachu": "皮卡丘", "Eevee": "伊布", "Dragonite": "快龍", "Gengar": "耿鬼", "Professor's Research": "博士的研究"},
}


def stable_id(kind, *parts):
    return str(uuid5(NAMESPACE_URL, "card-manager:" + kind + ":" + ":".join(str(part) for part in parts)))


def localized_name(language_code, english_name):
    return LOCAL_NAMES.get(language_code, {}).get(english_name, english_name)


def write_csv(name, fieldnames, rows):
    path = CSV_DIR / f"{name}.csv"
    with path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def json_value(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def main():
    CSV_DIR.mkdir(parents=True, exist_ok=True)

    language_rows = [
        {
            "id": stable_id("language", code),
            "code": code,
            "name": name,
            "native_name": native_name,
            "status": status,
            "notes": f"{name} development print language",
        }
        for code, name, native_name, status, _region in LANGUAGES
    ]
    language_ids = {row["code"]: row["id"] for row in language_rows}

    region_rows = [{"id": stable_id("region", code), "code": code, "name": name} for code, name in REGIONS]
    region_ids = {row["code"]: row["id"] for row in region_rows}

    sources = [
        {
            "id": stable_id("source", "manual"),
            "name": "Generated Dev Fixture",
            "url": "",
            "source_type": "manual",
            "license_notes": "Deterministic fake data generated locally for development",
            "terms_url": "",
        },
        {
            "id": SOURCE_ID,
            "name": "Pokemon TCG API Images",
            "url": "https://images.pokemontcg.io",
            "source_type": "api",
            "license_notes": "Development image URLs follow the public Pokemon TCG API image CDN shape",
            "terms_url": "https://docs.pokemontcg.io",
        },
    ]

    series_rows = []
    series_ids = {}
    for code, _name, _native, _status, region_code in LANGUAGES:
        for slug, name, start_date, end_date in SERIES_TEMPLATES:
            series_id = stable_id("series", code, slug)
            series_ids[(code, slug)] = series_id
            series_rows.append(
                {
                    "id": series_id,
                    "language_id": language_ids[code],
                    "region_id": region_ids[region_code],
                    "name": name,
                    "local_name": f"{name} ({code})",
                    "start_date": start_date,
                    "end_date": end_date,
                    "notes": f"{name} localized development series for {code}",
                }
            )

    set_rows = []
    set_ids = {}
    for code, _name, _native, _status, region_code in LANGUAGES:
        for slug, series_slug, name, set_code, count, secret_count, release_date, set_type in SET_TEMPLATES:
            set_id = stable_id("set", code, slug)
            set_ids[(code, slug)] = set_id
            set_rows.append(
                {
                    "id": set_id,
                    "series_id": series_ids[(code, series_slug)],
                    "language_id": language_ids[code],
                    "region_id": region_ids[region_code],
                    "name": name,
                    "local_name": f"{name} ({code})",
                    "set_code": f"{set_code}-{code.upper()}",
                    "official_card_count": count,
                    "secret_card_count": secret_count,
                    "release_date": release_date,
                    "set_type": set_type,
                    "notes": f"Generated localized test set for {code}",
                }
            )

    relationship_rows = []
    for slug, *_rest in SET_TEMPLATES:
        english_id = set_ids[("en", slug)]
        for code, *_ in LANGUAGES:
            if code == "en":
                continue
            relationship_rows.append(
                {
                    "id": stable_id("set-relationship", slug, "en", code),
                    "source_set_id": english_id,
                    "target_set_id": set_ids[(code, slug)],
                    "relationship_type": "localized_as",
                    "confidence": "0.95",
                    "notes": f"English {slug} localized for {code} in generated fixture",
                }
            )

    concept_rows = []
    text_rows = []
    detail_rows = []
    attack_rows = []
    ability_rows = []
    for index, card in enumerate(CARDS, start=1):
        concept_id = stable_id("concept", card["slug"])
        concept_rows.append(
            {
                "id": concept_id,
                "original_language_id": language_ids["en"],
                "original_set_id": set_ids[("en", "base")],
                "original_card_number": f"{index:03d}",
                "canonical_name": card["name"],
                "card_category": card["category"],
                "artist": card["artist"],
                "regulation_mark": "G" if index > 7 else "",
                "evolves_from": card["evolves_from"],
                "concept_fingerprint": f"dev-{card['slug']}-fixture",
                "notes": "Generated reusable card concept for development testing",
            }
        )
        if card["category"] == "pokemon":
            detail_rows.append(
                {
                    "card_concept_id": concept_id,
                    "hp": card["hp"],
                    "pokemon_type": card["type"],
                    "stage": card["stage"],
                    "subtype": "",
                    "rule_box": "ex" if index in {1, 8} else "",
                    "evolves_from": card["evolves_from"],
                }
            )
            attack_name, cost, damage, attack_text = card["attack"]
            attack_rows.append(
                {
                    "id": stable_id("attack", card["slug"], 1),
                    "card_concept_id": concept_id,
                    "attack_order": 1,
                    "name": attack_name,
                    "cost": json_value(cost),
                    "damage": damage,
                    "text": attack_text,
                }
            )
            if index in {1, 3, 9}:
                ability_rows.append(
                    {
                        "id": stable_id("ability", card["slug"]),
                        "card_concept_id": concept_id,
                        "name": "Collector Aura",
                        "text": "Once during your turn, you may look at the top card of your deck.",
                        "ability_type": "Ability",
                    }
                )

        for code, *_ in LANGUAGES:
            attack_payload = []
            if card["category"] == "pokemon":
                attack_name, cost, damage, attack_text = card["attack"]
                attack_payload = [{"name": attack_name, "cost": cost, "damage": damage, "text": attack_text}]
            text_rows.append(
                {
                    "id": stable_id("card-text", card["slug"], code),
                    "card_concept_id": concept_id,
                    "language_id": language_ids[code],
                    "name": localized_name(code, card["name"]),
                    "rules_text": card.get("rules", ""),
                    "flavor_text": card.get("flavor", ""),
                    "ability_name": "Collector Aura" if index in {1, 3, 9} else "",
                    "ability_text": "Once during your turn, you may look at the top card of your deck." if index in {1, 3, 9} else "",
                    "attacks": json_value(attack_payload) if attack_payload else "",
                    "weakness": json_value([{"type": "Water" if card["type"] == "Fire" else "Lightning", "value": "x2"}]) if card["category"] == "pokemon" else "",
                    "resistance": "",
                    "retreat_cost": 2 if card["category"] == "pokemon" else "",
                }
            )

    print_rows = []
    variant_rows = []
    image_rows = []
    source_mapping_rows = []
    print_index = 0
    variant_index = 0
    image_index = 0
    for code, *_language in LANGUAGES:
        for set_slug, _series_slug, _set_name, _set_code, _count, _secret, release_date, set_type in SET_TEMPLATES:
            for card_number, card in enumerate(CARDS, start=1):
                print_index += 1
                concept_id = stable_id("concept", card["slug"])
                print_id = stable_id("print", code, set_slug, card["slug"])
                rarity = "Promo" if set_type == "special" and card_number in {1, 8} else card["rarity"]
                print_rows.append(
                    {
                        "id": print_id,
                        "card_concept_id": concept_id,
                        "set_id": set_ids[(code, set_slug)],
                        "language_id": language_ids[code],
                        "printed_name": localized_name(code, card["name"]),
                        "card_number": f"{card_number:03d}",
                        "printed_total": "010",
                        "rarity": rarity,
                        "release_date": release_date,
                        "is_promo": "true" if rarity == "Promo" else "false",
                        "is_jumbo": "false",
                        "is_deck_exclusive": "false",
                        "external_reference": f"DEV-{code.upper()}-{set_slug.upper()}-{card_number:03d}",
                        "notes": "Generated localized print for development testing",
                    }
                )

                variant_types = ["holo", "reverse_holo"] if "Rare" in rarity or rarity == "Promo" else ["normal", "reverse_holo"]
                if set_slug == "base" and code in {"en", "ja", "fr", "de"} and "Rare" in rarity:
                    variant_types.append("first_edition")
                if set_type == "special" and card_number in {1, 8}:
                    variant_types.append("stamped")

                for variant_type in variant_types:
                    variant_index += 1
                    variant_id = stable_id("variant", code, set_slug, card["slug"], variant_type)
                    variant_rows.append(
                        {
                            "id": variant_id,
                            "card_print_id": print_id,
                            "variant_type": variant_type,
                            "foil_type": "reverse" if variant_type == "reverse_holo" else ("holo" if variant_type in {"holo", "first_edition", "stamped"} else ""),
                            "stamp_text": "Prerelease" if variant_type == "stamped" else ("1st Edition" if variant_type == "first_edition" else ""),
                            "edition": "first_edition" if variant_type == "first_edition" else "unlimited",
                            "is_tournament_legal": "true",
                            "notes": f"{variant_type} generated test variant",
                        }
                    )
                    image_index += 1
                    image_rows.append(
                        {
                            "id": stable_id("image", code, set_slug, card["slug"], variant_type),
                            "print_variant_id": variant_id,
                            "image_url": card["image"],
                            "image_source": "Pokemon TCG API Images",
                            "width": 734,
                            "height": 1024,
                            "is_front": "true",
                        }
                    )

                if print_index <= 50:
                    source_mapping_rows.append(
                        {
                            "id": stable_id("source-mapping", print_id),
                            "source_id": SOURCE_ID,
                            "entity_type": "card_print",
                            "entity_id": print_id,
                            "external_id": f"fixture-{code}-{set_slug}-{card['slug']}",
                            "external_url": card["image"],
                            "raw_payload": json_value({"image": card["image"], "generated": True}),
                            "last_checked_at": "2026-06-15T00:00:00Z",
                        }
                    )

    import_job_id = stable_id("import-job", "generated-fixture")
    raw_record_id = stable_id("raw-import-record", "generated-fixture")

    write_csv("languages", ["id", "code", "name", "native_name", "status", "notes"], language_rows)
    write_csv("regions", ["id", "code", "name"], region_rows)
    write_csv("sources", ["id", "name", "url", "source_type", "license_notes", "terms_url"], sources)
    write_csv("series", ["id", "language_id", "region_id", "name", "local_name", "start_date", "end_date", "notes"], series_rows)
    write_csv("sets", ["id", "series_id", "language_id", "region_id", "name", "local_name", "set_code", "official_card_count", "secret_card_count", "release_date", "set_type", "notes"], set_rows)
    write_csv("set_relationships", ["id", "source_set_id", "target_set_id", "relationship_type", "confidence", "notes"], relationship_rows)
    write_csv("card_concepts", ["id", "original_language_id", "original_set_id", "original_card_number", "canonical_name", "card_category", "artist", "regulation_mark", "evolves_from", "concept_fingerprint", "notes"], concept_rows)
    write_csv("card_texts", ["id", "card_concept_id", "language_id", "name", "rules_text", "flavor_text", "ability_name", "ability_text", "attacks", "weakness", "resistance", "retreat_cost"], text_rows)
    write_csv("pokemon_card_details", ["card_concept_id", "hp", "pokemon_type", "stage", "subtype", "rule_box", "evolves_from"], detail_rows)
    write_csv("attacks", ["id", "card_concept_id", "attack_order", "name", "cost", "damage", "text"], attack_rows)
    write_csv("abilities", ["id", "card_concept_id", "name", "text", "ability_type"], ability_rows)
    write_csv("card_prints", ["id", "card_concept_id", "set_id", "language_id", "printed_name", "card_number", "printed_total", "rarity", "release_date", "is_promo", "is_jumbo", "is_deck_exclusive", "external_reference", "notes"], print_rows)
    write_csv("print_variants", ["id", "card_print_id", "variant_type", "foil_type", "stamp_text", "edition", "is_tournament_legal", "notes"], variant_rows)
    write_csv("card_images", ["id", "print_variant_id", "image_url", "image_source", "width", "height", "is_front"], image_rows)
    write_csv("source_mappings", ["id", "source_id", "entity_type", "entity_id", "external_id", "external_url", "raw_payload", "last_checked_at"], source_mapping_rows)
    write_csv("import_jobs", ["id", "source_id", "job_type", "status", "started_at", "finished_at", "error_message", "metadata"], [
        {
            "id": import_job_id,
            "source_id": stable_id("source", "manual"),
            "job_type": "generated-fixture",
            "status": "success",
            "started_at": "2026-06-15T00:00:00Z",
            "finished_at": "2026-06-15T00:00:01Z",
            "error_message": "",
            "metadata": json_value({"languages": len(LANGUAGES), "sets": len(set_rows), "prints": len(print_rows), "variants": len(variant_rows)}),
        }
    ])
    write_csv("raw_import_records", ["id", "import_job_id", "source_id", "record_type", "external_id", "payload", "normalized"], [
        {
            "id": raw_record_id,
            "import_job_id": import_job_id,
            "source_id": stable_id("source", "manual"),
            "record_type": "fixture_summary",
            "external_id": "generated-fixture-v1",
            "payload": json_value({"sets": len(set_rows), "prints": len(print_rows), "images": len(image_rows)}),
            "normalized": "true",
        }
    ])

    print(f"Generated {len(set_rows)} sets, {len(print_rows)} prints, {len(variant_rows)} variants, {len(image_rows)} images")


if __name__ == "__main__":
    main()
