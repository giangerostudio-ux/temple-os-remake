#!/usr/bin/env python3
import re
import sys
from pathlib import Path


DEFAULT_RC_XML = """<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <desktops>
    <number>4</number>
    <firstdesk>1</firstdesk>
    <names>
      <name>Desktop 1</name>
      <name>Desktop 2</name>
      <name>Desktop 3</name>
      <name>Desktop 4</name>
    </names>
    <popupTime>875</popupTime>
  </desktops>
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


TEMPLEOS_TITLE = "TempleOS - Divine Operating System"


def ensure_templeos_app_rule(xml: str) -> str:
    # Keep the Electron shell window in the "below" layer and prevent it from raising on click/focus.
    # This avoids the "X11 apps disappear when I click the TempleOS desktop" behavior.
    if re.search(rf"<application\b[^>]*\btitle=['\"]{re.escape(TEMPLEOS_TITLE)}['\"]", xml, flags=re.IGNORECASE):
        return xml

    rule = f"""
  <application title="{TEMPLEOS_TITLE}">
    <layer>below</layer>
    <raise>no</raise>
    <focus>yes</focus>
    <desktop>all</desktop>
    <skip_pager>yes</skip_pager>
    <skip_taskbar>yes</skip_taskbar>
  </application>
"""

    if re.search(r"<applications\b", xml, flags=re.IGNORECASE):
        return re.sub(r"(</applications\s*>)", rule + r"\1", xml, count=1, flags=re.IGNORECASE)

    block = f"""
  <applications>{rule}  </applications>
"""
    return re.sub(r"(</openbox_config\s*>)", block + r"\1", xml, count=1, flags=re.IGNORECASE)


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
            r"<keybind\b[^>]*>.*?<action\b[^>]*name=['\"]ShowDesktop['\"][^>]*>.*?</keybind>",
            r"<keybind\b[^>]*>.*?<action\b[^>]*name=['\"]ShowDesktop['\"][^>]*/>.*?</keybind>",
            r"<mousebind\b[^>]*>.*?<action\b[^>]*name=['\"]ToggleShowDesktop['\"][^>]*>.*?</mousebind>",
            r"<mousebind\b[^>]*>.*?<action\b[^>]*name=['\"]ToggleShowDesktop['\"][^>]*/>.*?</mousebind>",
            r"<mousebind\b[^>]*>.*?<action\b[^>]*name=['\"]ShowDesktop['\"][^>]*>.*?</mousebind>",
            r"<mousebind\b[^>]*>.*?<action\b[^>]*name=['\"]ShowDesktop['\"][^>]*/>.*?</mousebind>",
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

    # Ensure 4 desktops are configured (for workspace switching)
    if not re.search(r"<desktops\b", xml, flags=re.IGNORECASE):
        desktops_block = """
  <desktops>
    <number>4</number>
    <firstdesk>1</firstdesk>
    <names>
      <name>Desktop 1</name>
      <name>Desktop 2</name>
      <name>Desktop 3</name>
      <name>Desktop 4</name>
    </names>
    <popupTime>875</popupTime>
  </desktops>
"""
        # Insert after <openbox_config...>
        xml = re.sub(r"(<openbox_config\b[^>]*>)", r"\1" + desktops_block, xml, count=1, flags=re.IGNORECASE)
    else:
        # Ensure number is at least 4
        xml = re.sub(r"(<desktops\b[^>]*>.*?<number>)\d+(</number>)", r"\g<1>4\g<2>", xml, count=1, flags=re.DOTALL | re.IGNORECASE)

    xml = ensure_templeos_app_rule(xml)

    path.write_text(xml, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
