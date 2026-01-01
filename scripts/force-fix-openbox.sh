#!/bin/bash
# FORCE FIX OPENBOX CONFIG
# Run this to completely reset rc.xml to the correct TempleOS state.

mkdir -p "$HOME/.config/openbox"
RC_XML="$HOME/.config/openbox/rc.xml"
THEME="TempleOS-Divine"

echo "Backing up old rc.xml..."
cp "$RC_XML" "$RC_XML.backup.$(date +%s)"

echo "Writing fresh rc.xml with Theme: $THEME and Margins: 40px..."

cat > "$RC_XML" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
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
      <name>TempleOS</name>
    </names>
  </desktops>

  <!-- TASKBAR MARGIN FIX -->
  <margins>
    <top>0</top>
    <bottom>0</bottom>
    <left>0</left>
    <right>0</right>
  </margins>

  <!-- THEME FIX -->
  <theme>
    <name>$THEME</name>
    <titleLayout>NLIMC</titleLayout>
    <keepBorder>no</keepBorder>
    <animateIconify>no</animateIconify>
  </theme>

  <keyboard>
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

    <!-- CLOSE BUTTON -->
    <context name="Close">
      <mousebind button="Left" action="Click">
        <action name="Close"/>
      </mousebind>
    </context>

    <!-- MAXIMIZE BUTTON -->
    <context name="Maximize">
      <mousebind button="Left" action="Click">
        <action name="ToggleMaximize"/>
      </mousebind>
      <mousebind button="Middle" action="Click">
        <action name="ToggleMaximizeVert"/>
      </mousebind>
      <mousebind button="Right" action="Click">
        <action name="ToggleMaximizeHorz"/>
      </mousebind>
    </context>

    <!-- ICONIFY (MINIMIZE) BUTTON -->
    <context name="Iconify">
      <mousebind button="Left" action="Click">
        <action name="Iconify"/>
      </mousebind>
    </context>

    <!-- FRAME: Alt+Click for move/resize anywhere -->
    <context name="Frame">
      <mousebind button="A-Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="A-Left" action="Click">
        <action name="Unshade"/>
      </mousebind>
      <mousebind button="A-Left" action="Drag">
        <action name="Move"/>
      </mousebind>
      <mousebind button="A-Right" action="Drag">
        <action name="Resize"/>
      </mousebind> 
    </context>
  </mouse>

  <applications>
    <application title="TempleOS - Divine Operating System">
       <layer>below</layer>
       <raise>no</raise>
       <focus>yes</focus>
    </application>
    <!-- Force Firefox to use Openbox decorations (not its own CSD) -->
    <application class="firefox" name="*">
      <decor>yes</decor>
    </application>
    <application class="Firefox" name="*">
      <decor>yes</decor>
    </application>
    <application class="Navigator" name="*">
      <decor>yes</decor>
    </application>
  </applications>
  
</openbox_config>
EOF

# Always re-install theme to apply any updates (like padding)
echo "Re-installing theme to ensure latest geometry..."
./scripts/apply-theme.sh

echo "Reloading Openbox..."
openbox --reconfigure

echo "✅ DONE using Force Fix."
echo "If this doesn't work, verify your Openbox installation."
