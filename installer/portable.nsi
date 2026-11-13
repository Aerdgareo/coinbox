Unicode true
RequestExecutionLevel user
SilentInstall silent
SetCompressor /SOLID lzma
SetCompressorDictSize 64
SetDatablockOptimize on
CRCCheck off

!define APP_NAME "攒钱盲盒"
!define APP_VERSION "1.0.2"
!define APP_EXE "CoinBox.exe"

Name "${APP_NAME} 便携版"
OutFile "..\release\CoinBox-${APP_VERSION}-x64-Portable.exe"
Icon "..\build\icon.ico"
UninstallIcon "..\build\icon.ico"

VIProductVersion "1.0.2.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "FileDescription" "${APP_NAME} 便携版"
VIAddVersionKey "FileVersion" "${APP_VERSION}.0"
VIAddVersionKey "ProductVersion" "${APP_VERSION}.0"
VIAddVersionKey "LegalCopyright" "CoinBox"

Section "Main"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\app"
  File /r "..\release\win-unpacked\*.*"

  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_DIR", "$EXEDIR").r0'
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_FILE", "$EXEPATH").r0'

  ExecWait '"$PLUGINSDIR\app\${APP_EXE}"' $0
  SetErrorLevel $0

  SetOutPath "$EXEDIR"
  RMDir /r "$PLUGINSDIR\app"
SectionEnd