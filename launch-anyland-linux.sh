#!/bin/bash
PROTON_VERSION="${PROTON_VERSION:-GE-Proton9-22}"
PROTON_PATH="${PROTON_PATH:-$HOME/.steam/root/compatibilitytools.d/$PROTON_VERSION/proton}"
CLIENT_PATH="${CLIENT_PATH:-$HOME/Downloads/Echoland Client}"

export STEAM_COMPAT_CLIENT_INSTALL_PATH=~/.local/share/Steam
export STEAM_COMPAT_DATA_PATH=$CLIENT_PATH/steamapps/compatdata/505700
export PRESSURE_VESSEL_FILESYSTEMS_RW=$XDG_RUNTIME_DIR/wivrn_comp_ipc
export WINEDLLOVERRIDES="winhttp=n,b"
export DOORSTOP_ENABLE=TRUE
export DOORSTOP_INVOKE_DLL_PATH="BepInEx/core/BepInEx.Preloader.dll"
export PROTON_USE_WINED3D=1

echo "Launching Anyland from $CLIENT_PATH/anyland.exe with Proton $PROTON_VERSION"

"$PROTON_PATH" run "$CLIENT_PATH/anyland.exe"