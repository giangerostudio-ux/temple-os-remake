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
    <bottom>40</bottom>
    <left>0</left>
    <right>0</right>
  </margins>

  <!-- THEME FIX -->
  <theme>
    <name>$THEME</name>
    <titleLayout>NLIMC</titleLayout>
    <keepBorder>yes</keepBorder>
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
  </applications>
  
</openbox_config>
EOF

# Ensure the theme folder exists
if [ ! -d "$HOME/.local/share/themes/$THEME" ]; then
    echo "Theme folder missing. Re-installing theme..."
    ./scripts/apply-theme.sh
fi

echo "Reloading Openbox..."
openbox --reconfigure

echo "✅ DONE using Force Fix."
echo "If this doesn't work, verify your Openbox installation."
