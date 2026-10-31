import io
import json
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT))

import update_tcgdex_data as images
import update_data
from update_logging import capture_run_log


def http_error(url, code, body=b"upstream error"):
    return HTTPError(url, code, "request failed", {}, io.BytesIO(body))


class ImageUpdateTests(unittest.TestCase):
    def fetch(self, side_effect, fallbacks=None):
        output = io.StringIO()
        with patch.object(images, "download_webp", side_effect=side_effect) as download, \
                patch.object(images.time, "sleep") as sleep:
            error = None
            try:
                images.download_asset("https://assets.test/en/SV/SV1S/symbol.webp",
                                      Path("symbol.webp"), 10, output,
                                      threading.Lock(), fallbacks or [])
            except (HTTPError, URLError, ValueError) as caught:
                error = caught
        return [json.loads(line) for line in output.getvalue().splitlines()], download, sleep, error

    def test_url_preserves_upstream_case_and_escapes_parts(self):
        self.assertEqual(
            images.asset_url("ja", "SV", "SV1S", "001", "high.webp"),
            "https://assets.tcgdex.net/ja/SV/SV1S/001/high.webp",
        )
        self.assertIn("/zh-cn/SV/SV%20P/", images.asset_url("zh-CN", "SV", "SV P", "logo.webp"))

    def test_transient_http_error_retries_and_logs_body(self):
        records, download, sleep, error = self.fetch([http_error("u", 503, b"service unavailable"), None])
        self.assertIsNone(error)
        self.assertEqual(download.call_count, 2)
        sleep.assert_called_once_with(1)
        self.assertEqual([row["status"] for row in records], ["retry", "downloaded"])
        self.assertEqual(records[0]["response_body"], "service unavailable")
        self.assertEqual(records[0]["http_status"], 503)

    def test_network_failure_stops_after_three_attempts(self):
        records, download, sleep, error = self.fetch(URLError("connection lost"))
        self.assertIsInstance(error, URLError)
        self.assertEqual(download.call_count, 3)
        self.assertEqual([row["attempt"] for row in records], [1, 2, 3])
        self.assertEqual(records[-1]["status"], "failed")
        self.assertEqual(sleep.call_count, 2)

    def test_permanent_http_error_does_not_retry(self):
        records, download, sleep, error = self.fetch(http_error("u", 400, b"InvalidBucketName"))
        self.assertIsInstance(error, HTTPError)
        self.assertEqual(download.call_count, 1)
        sleep.assert_not_called()
        self.assertEqual(records[0]["status"], "failed")
        self.assertEqual(records[0]["response_body"], "InvalidBucketName")

    def test_symbol_404_tries_localized_fallback(self):
        fallback = "https://assets.test/ja/SV/SV1S/symbol.webp"
        records, download, sleep, error = self.fetch([http_error("u", 404), None], [fallback])
        self.assertIsNone(error)
        self.assertEqual([row["status"] for row in records], ["fallback", "downloaded"])
        self.assertEqual(records[-1]["url"], fallback)
        sleep.assert_not_called()

    def test_card_404_is_unavailable_without_retry(self):
        records, download, sleep, error = self.fetch(http_error("u", 404))
        self.assertIsInstance(error, HTTPError)
        self.assertEqual(download.call_count, 1)
        self.assertEqual(records[0]["status"], "unavailable")
        sleep.assert_not_called()

    def test_error_body_is_bounded(self):
        records, _, _, _ = self.fetch(http_error("u", 400, b"x" * 5000))
        self.assertEqual(len(records[0]["response_body"]), 2048)

    def test_sync_updates_references_counts_and_clears_log(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / "app" / "data"
            series = data / "asia-sv"
            series.mkdir(parents=True)
            (series / "sets.json").write_text(json.dumps([{
                "id": "asia-sv1s", "tcgdex_id": "SV1S", "tcgdex_series_id": "SV",
                "language_ids": ["ja"],
            }]))
            cards_path = series / "cards_asia-sv1s.json"
            cards_path.write_text(json.dumps([{
                "number": "001", "variants": [{"images": {"ja": ""}}],
            }]))
            log_path = root / "reports" / "images.jsonl"
            log_path.parent.mkdir()
            log_path.write_text("old run\n")

            def download(url, destination, timeout):
                if "/en/" in url:
                    raise http_error(url, 404)
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(b"RIFFxxxxWEBP")

            public = root / "app" / "public" / "images"
            with patch.object(images, "download_webp", side_effect=download):
                result = images.sync_assets(data, public, 2, 10, log_path=log_path)
            self.assertEqual(result["downloaded"], 3)
            self.assertEqual(result["failures"], 0)
            self.assertEqual(result["filled_references"], 1)
            records = [json.loads(line) for line in log_path.read_text().splitlines()]
            self.assertEqual(len(records), 4)
            self.assertFalse(any("/univ/" in row["url"] for row in records))
            self.assertTrue(json.loads(cards_path.read_text())[0]["variants"][0]["images"]["ja"])
            result = images.sync_assets(data, public, 2, 10, log_path=log_path)
            self.assertEqual(result["candidates"], 0)
            self.assertEqual(log_path.read_text(), "")

    def test_run_transcript_overwrites_and_includes_child_stderr(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "update.log"
            path.write_text("old run\n")
            with capture_run_log(path):
                print("parent output")
                update_data.run_stage("test", [sys.executable, "-c",
                                               "import sys; print('child output'); print('child error', file=sys.stderr)"])
                with self.assertRaises(subprocess.CalledProcessError) as caught:
                    update_data.run_stage("failure", [sys.executable, "-c", "raise SystemExit(7)"])
                self.assertEqual(caught.exception.returncode, 7)
            transcript = path.read_text()
            self.assertNotIn("old run", transcript)
            self.assertIn("parent output", transcript)
            self.assertIn("child output", transcript)
            self.assertIn("child error", transcript)


if __name__ == "__main__":
    unittest.main()
