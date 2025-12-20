#!/usr/bin/env python3
import re
import sys
from pathlib import Path


DEFAULT_RC_XML = """<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <resistance>
    <strength>10</strength>
    <screen_edge_strength>20</screen_edge_strength>
  </resistance>
  <focus>
    <focusNew>yes</focusNew>
    <focusLast>yes</focusLast>
    <followMouse>no</followMouse>
    <focusDelay>200</focusDelay>
    <raiseOnFocus>no</raiseOnFocus>
  </focus>
  <placement>
    <policy>Smart</policy>
    <center>yes</center>
    <monitor>Primary</monitor>
  </placement>
  <theme>
    <name>Clearlooks</name>
    <titleLayout>NLIMC</titleLayout>
    <keepBorder>yes</keepBorder>
    <animateIconify>no</animateIconify>
  </theme>
  <keyboard>
    <!-- Keep this minimal; TempleOS handles Win-key shortcuts in-app. -->
    <chainQuitKey>C-g</chainQuitKey>
  </keyboard>
</openbox_config>
"""


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
    if not xml.strip() or "<openbox_config" not in xml:
        # Avoid generating an invalid config: Openbox will refuse to start if rc.xml is empty/malformed.
        xml = DEFAULT_RC_XML

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

    # Safety: ensure we didn't end up with an empty/invalid file.
    if not xml.strip() or "<openbox_config" not in xml:
        xml = DEFAULT_RC_XML

    path.write_text(xml, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
