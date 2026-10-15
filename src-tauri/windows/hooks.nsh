; Register Lume as a candidate. Never write extension defaults or UserChoice.
!define LUME_PROGID "LumeNotes.Document"
!define LUME_CAPABILITIES "Software\LumeNotes\Capabilities"

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\${LUME_PROGID}" "" "Lume Notes Document"
  WriteRegStr HKCU "Software\Classes\${LUME_PROGID}" "FriendlyTypeName" "Lume Notes Document"
  WriteRegStr HKCU "Software\Classes\${LUME_PROGID}\DefaultIcon" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr HKCU "Software\Classes\${LUME_PROGID}\shell\open\command" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe" "FriendlyAppName" "Lume Notes"
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\shell\open\command" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
  WriteRegStr HKCU "${LUME_CAPABILITIES}" "ApplicationName" "Lume Notes"
  WriteRegStr HKCU "${LUME_CAPABILITIES}" "ApplicationDescription" "Editor de texto e Markdown com abas."
  WriteRegStr HKCU "${LUME_CAPABILITIES}" "ApplicationIcon" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr HKCU "Software\RegisteredApplications" "Lume Notes" "${LUME_CAPABILITIES}"
  WriteRegStr HKCU "Software\LumeNotes\Install" "Executable" "$INSTDIR\${MAINBINARYNAME}.exe"
  WriteRegStr HKCU "Software\Classes\.txt\OpenWithProgids" "${LUME_PROGID}" ""
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".txt" ""
  WriteRegStr HKCU "${LUME_CAPABILITIES}\FileAssociations" ".txt" "${LUME_PROGID}"
  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "${LUME_PROGID}" ""
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".md" ""
  WriteRegStr HKCU "${LUME_CAPABILITIES}\FileAssociations" ".md" "${LUME_PROGID}"
  WriteRegStr HKCU "Software\Classes\.json\OpenWithProgids" "${LUME_PROGID}" ""
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".json" ""
  WriteRegStr HKCU "${LUME_CAPABILITIES}\FileAssociations" ".json" "${LUME_PROGID}"
  WriteRegStr HKCU "Software\Classes\.log\OpenWithProgids" "${LUME_PROGID}" ""
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".log" ""
  WriteRegStr HKCU "${LUME_CAPABILITIES}\FileAssociations" ".log" "${LUME_PROGID}"
  WriteRegStr HKCU "Software\Classes\.csv\OpenWithProgids" "${LUME_PROGID}" ""
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".csv" ""
  WriteRegStr HKCU "${LUME_CAPABILITIES}\FileAssociations" ".csv" "${LUME_PROGID}"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; An old uninstaller must not remove the registration of a newer installation elsewhere.
  ReadRegStr $R8 HKCU "Software\Classes\${LUME_PROGID}\shell\open\command" ""
  ${If} $R8 == '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
    DeleteRegValue HKCU "Software\Classes\.txt\OpenWithProgids" "${LUME_PROGID}"
    DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "${LUME_PROGID}"
    DeleteRegValue HKCU "Software\Classes\.json\OpenWithProgids" "${LUME_PROGID}"
    DeleteRegValue HKCU "Software\Classes\.log\OpenWithProgids" "${LUME_PROGID}"
    DeleteRegValue HKCU "Software\Classes\.csv\OpenWithProgids" "${LUME_PROGID}"
    DeleteRegKey HKCU "Software\Classes\${LUME_PROGID}"
    DeleteRegKey HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe"
    DeleteRegKey HKCU "${LUME_CAPABILITIES}"
    DeleteRegValue HKCU "Software\RegisteredApplications" "Lume Notes"
  ${EndIf}
  ReadRegStr $R8 HKCU "Software\LumeNotes\Install" "Executable"
  ${If} $R8 == "$INSTDIR\${MAINBINARYNAME}.exe"
    DeleteRegKey HKCU "Software\LumeNotes\Install"
  ${EndIf}
  ; Session and WebView preferences belong to the user, not the installation.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
