#!/usr/bin/env python3
import re
import sys
from pathlib import Path


def strip_blocks(xml: str, patterns: list[str]) -> str:
    out = xml
    for pat in patterns:
        out = re.sub(pat, "", out, flags=re.DOTALL | re.IGNORECASE)
    return out


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: patch-openbox-rcxml.py /path/to/rc.xml", file=sys.stderr)
        return 2

    path = Path(sys.argv[1]).expanduser()
    if not path.exists():
        print(f"rc.xml not found: {path}", file=sys.stderr)
        return 1

    xml = path.read_text(encoding="utf-8", errors="ignore")

    # Remove any keybind/mousebind that triggers ToggleShowDesktop.
    xml = strip_blocks(
        xml,
        [
            r"<keybind\b[^>]*>.*?<action\b[^>]*name=['\"]ToggleShowDesktop['\"][^>]*>.*?</keybind>",
            r"<keybind\b[^>]*>.*?<action\b[^>]*name=['\"]ToggleShowDesktop['\"][^>]*/>.*?</keybind>",
            r"<mousebind\b[^>]*>.*?<action\b[^>]*name=['\"]ToggleShowDesktop['\"][^>]*>.*?</mousebind>",
            r"<mousebind\b[^>]*>.*?<action\b[^>]*name=['\"]ToggleShowDesktop['\"][^>]*/>.*?</mousebind>",
        ],
    )

    # Also remove common Openbox "Windows key" shortcuts that conflict with the shell.
    # (We still allow Alt-based bindings like Alt-Tab.)
    xml = strip_blocks(
        xml,
        [
            r"<keybind\s+key=['\"]W-d['\"]\s*>.*?</keybind>",
            r"<keybind\s+key=['\"]W-e['\"]\s*>.*?</keybind>",
            r"<keybind\s+key=['\"]W-Tab['\"]\s*>.*?</keybind>",
            r"<keybind\s+key=['\"]W-[0-9]['\"]\s*>.*?</keybind>",
            r"<keybind\s+key=['\"]W-F[0-9]+['\"]\s*>.*?</keybind>",
        ],
    )

    path.write_text(xml, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

