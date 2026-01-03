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
  <desktops>
    <number>1</number>
    <firstdesk>1</firstdesk>
    <names>
      <name>Desktop</name>
    </names>
  </desktops>
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
  <mouse>
    <dragThreshold>1</dragThreshold>
    <doubleClickTime>500</doubleClickTime>
    <screenEdgeWarpTime>400</screenEdgeWarpTime>
    <screenEdgeWarpMouse>false</screenEdgeWarpMouse>

    <!-- TITLEBAR: Normal drag-to-move + focus/raise -->
    <context name="Titlebar">
      <mousebind button="Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="Left" action="Drag">
        <action name="Move"/>
      </mousebind>
      <mousebind button="Left" action="DoubleClick">
        <action name="ToggleMaximize"/>
      </mousebind>
      <mousebind button="Right" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
        <action name="ShowMenu"><menu>client-menu</menu></action>
      </mousebind>
    </context>

    <!-- CLIENT: Click anywhere in window content to focus (CRITICAL for click-to-focus) -->
    <context name="Client">
      <mousebind button="Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="Middle" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="Right" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
    </context>

    <!-- FRAME: Alt+Click for move/resize anywhere -->
    <context name="Frame">
      <mousebind button="A-Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="A-Left" action="Drag">
        <action name="Move"/>
      </mousebind>
      <mousebind button="A-Right" action="Drag">
        <action name="Resize"/>
      </mousebind>
    </context>
  </mouse>
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
    <decor>no</decor>
    <position force="yes">
      <x>0</x>
      <y>0</y>
    </position>
    <size>
      <width>100%</width>
      <height>100%</height>
    </size>
    <maximized>no</maximized>
  </application>
"""

    if re.search(r"<applications\b", xml, flags=re.IGNORECASE):
        return re.sub(r"(</applications\s*>)", rule + r"\1", xml, count=1, flags=re.IGNORECASE)

    block = f"""
  <applications>{rule}  </applications>
"""
    return re.sub(r"(</openbox_config\s*>)", block + r"\1", xml, count=1, flags=re.IGNORECASE)


def ensure_single_desktop(xml: str) -> str:
    """Ensure only 1 virtual desktop is configured to prevent apps appearing on wrong desktop."""
    # If <desktops> section exists, patch <number> to 1
    if re.search(r"<desktops\b", xml, flags=re.IGNORECASE):
        # Replace existing <number>N</number> with <number>1</number>
        xml = re.sub(r"(<desktops\b[^>]*>.*?<number>)\d+(</number>)", r"\g<1>1\g<2>", xml, flags=re.DOTALL | re.IGNORECASE)
        return xml
    
    # If no <desktops> section, add one
    desktops_block = """
  <desktops>
    <number>1</number>
    <firstdesk>1</firstdesk>
    <names>
      <name>Desktop</name>
    </names>
  </desktops>
"""
    # Insert before </openbox_config>
    return re.sub(r"(</openbox_config\s*>)", desktops_block + r"\1", xml, count=1, flags=re.IGNORECASE)


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

    xml = ensure_templeos_app_rule(xml)
    xml = ensure_single_desktop(xml)
    xml = ensure_margins(xml)

    path.write_text(xml, encoding="utf-8")
    return 0


def ensure_margins(xml: str) -> str:
    """Ensure bottom margin is reserved for the taskbar."""
    # Check if <margins> block exists
    if re.search(r"<margins\b", xml, flags=re.IGNORECASE):
        # Update existing bottom margin
        if re.search(r"<bottom>\d+</bottom>", xml, flags=re.IGNORECASE):
            xml = re.sub(r"(<bottom>)\d+(</bottom>)", r"\g<1>67\g<2>", xml, flags=re.IGNORECASE)
        else:
            # Add bottom margin to existing margins block
            xml = re.sub(r"(</margins>)", r"  <bottom>67</bottom>\n    \1", xml, flags=re.IGNORECASE)
        return xml

    # Add new margins block
    margins_block = """
  <margins>
    <top>0</top>
    <bottom>67</bottom>
    <left>0</left>
    <right>0</right>
  </margins>
"""
    # Insert before </openbox_config>
    return re.sub(r"(</openbox_config\s*>)", margins_block + r"\1", xml, count=1, flags=re.IGNORECASE)


if __name__ == "__main__":
    raise SystemExit(main())
