"""Small terminal logger and progress bar shared by the data update scripts."""

from __future__ import annotations

import os
import shutil
import sys
import time
from typing import TextIO


def color(text: str, code: str, stream: TextIO) -> str:
    if stream.isatty() and "NO_COLOR" not in os.environ and os.environ.get("TERM") != "dumb":
        return f"\033[{code}m{text}\033[0m"
    return text


def log(*values: object, sep: str = " ", end: str = "\n", file: TextIO | None = None,
        flush: bool = True) -> None:
    stream = file if file is not None else sys.stdout
    message = sep.join(str(value) for value in values).strip("\n")
    if stream is sys.stderr:
        code = "33" if "warning" in message.lower() else "31"
    elif "complete" in message.lower() or "ready" in message.lower():
        code = "32"
    else:
        code = "0"
    stream.write("  " + color(message.lstrip(), code, stream) + end)
    if flush:
        stream.flush()


def title(label: str) -> None:
    sys.stdout.write("\n" + color(label, "1;36", sys.stdout) + "\n")
    sys.stdout.flush()


def duration(seconds: float) -> str:
    seconds = max(0, int(seconds))
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes:02d}m"
    return f"{minutes}m {seconds:02d}s" if minutes else f"{seconds}s"


class Progress:
    """Render one live line in terminals, or occasional plain log lines in files."""

    def __init__(self, label: str, total: int, stream: TextIO | None = None):
        self.label = label
        self.total = total
        self.stream = stream if stream is not None else sys.stdout
        self.interactive = self.stream.isatty() and os.environ.get("TERM") != "dumb"
        self.started = time.monotonic()
        self.last_rendered = float("-inf")
        self.completed = 0
        self.details = ""

    def __enter__(self) -> Progress:
        self.update(0, force=True)
        return self

    def update(self, completed: int, details: str = "", *, force: bool = False) -> None:
        self.completed, self.details = completed, details
        now = time.monotonic()
        if not force and now - self.last_rendered < (0.1 if self.interactive else 10):
            return
        self.last_rendered = now
        elapsed = now - self.started
        ratio = completed / self.total if self.total else 1
        remaining = duration(elapsed * (self.total - completed) / completed) if completed else "--"
        suffix = f"{completed:,}/{self.total:,} {ratio:4.0%} | {duration(elapsed)} | ETA {remaining}"
        if details:
            suffix += f" | {details}"
        if self.interactive:
            columns = shutil.get_terminal_size().columns
            if columns < len(suffix) + len(self.label) + 14 and details:
                suffix = suffix.rsplit(" | ", 1)[0]
            width = max(6, min(24, columns - len(suffix) - len(self.label) - 8))
            filled = int(width * ratio)
            bar = color("=" * filled, "36", self.stream) + " " * (width - filled)
            self.stream.write(f"\r\033[2K  {self.label} [{bar}] {suffix}")
        else:
            self.stream.write(f"  {self.label}: {suffix}\n")
        self.stream.flush()

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self.update(self.completed, self.details, force=True)
        if self.interactive:
            self.stream.write("\n")
            self.stream.flush()
