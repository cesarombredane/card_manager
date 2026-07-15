from __future__ import annotations

import argparse
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "sync_card_images.py"
SPEC = importlib.util.spec_from_file_location("sync_card_images", SCRIPT_PATH)
assert SPEC and SPEC.loader
sync_card_images = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync_card_images)


class SyncCardImagesTest(unittest.TestCase):
    def test_image_download_url(self) -> None:
        self.assertEqual(
            sync_card_images.image_download_url("https://assets.tcgdex.net/en/sv/sv01/001"),
            "https://assets.tcgdex.net/en/sv/sv01/001/high.webp",
        )
        self.assertEqual(sync_card_images.image_download_url("https://example.test/card.webp"), "https://example.test/card.webp")

    def test_catalog_matching(self) -> None:
        by_id, by_number = sync_card_images.card_catalog({"cards": [{"id": "sv01-001", "localId": "001", "image": "asset"}]})
        card = {"id": "intl-sv01-001", "number": "001"}
        self.assertEqual(sync_card_images.find_api_card(card, "sv01", by_id, by_number), by_id["sv01-001"])

    def test_sync_updates_variants_and_is_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            data_root = root / "data"
            cache_root = root / "cache"
            series_root = data_root / "intl-sv"
            series_root.mkdir(parents=True)
            (series_root / "sets.json").write_text(json.dumps([{
                "id": "intl-sv01",
                "tcgdex_id": "sv01",
                "language_ids": ["en"],
            }]), encoding="utf-8")
            cards_path = series_root / "cards_intl-sv01.json"
            cards_path.write_text(json.dumps([
                {
                    "id": "intl-sv01-001",
                    "number": "001",
                    "variants": [
                        {"id": "normal", "images": {"en": ""}},
                        {"id": "reverse", "images": {"en": ""}},
                    ],
                },
                {
                    "id": "intl-sv01-002",
                    "number": "002",
                    "variants": [{"id": "normal", "images": {"en": ""}}],
                },
            ]), encoding="utf-8")

            args = argparse.Namespace(
                data=str(data_root),
                cache=str(cache_root),
                set_ids=None,
                card_ids=None,
                language_ids=None,
                refresh_missing=False,
                timeout=1.0,
            )
            api_response = {"cards": [
                {"id": "sv01-001", "localId": "001", "image": "https://assets.test/001"},
                {"id": "sv01-002", "localId": "002"},
            ]}

            def fake_download(_url: str, destination: Path, _timeout: float) -> None:
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(b"cached image")

            with (
                patch.object(sync_card_images, "parse_args", return_value=args),
                patch.object(sync_card_images, "request_json", return_value=api_response) as request,
                patch.object(sync_card_images, "download_webp", side_effect=fake_download),
            ):
                self.assertEqual(sync_card_images.main(), 0)
                request.assert_called_once()

            cards = json.loads(cards_path.read_text(encoding="utf-8"))
            expected_url = "/images/cards/intl-sv01/en/001.webp"
            self.assertEqual(cards[0]["variants"][0]["images"]["en"], expected_url)
            self.assertEqual(cards[0]["variants"][1]["images"]["en"], expected_url)
            self.assertEqual(cards[1]["variants"][0]["images"]["en"], "")
            status = json.loads((cache_root / ".asset-status.json").read_text(encoding="utf-8"))
            self.assertIsNone(status["intl-sv01/en/intl-sv01-002"])

            with (
                patch.object(sync_card_images, "parse_args", return_value=args),
                patch.object(sync_card_images, "request_json") as request,
                patch.object(sync_card_images, "download_webp") as download,
            ):
                self.assertEqual(sync_card_images.main(), 0)
                request.assert_not_called()
                download.assert_not_called()


if __name__ == "__main__":
    unittest.main()
