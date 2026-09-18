; ---------------------------------------------------------------------------
;  E.V. — installer customisations
;
;  Why this file exists:
;  electron-builder's default "is the app running?" check tries to close the
;  app gracefully by sending a close message to its windows. An Electron app is
;  not one process — it spawns extra EV.exe children for the GPU, the renderer
;  and utility work, and those have no window at all to receive the message. It
;  also cannot close a main window that is hidden (E.V. hides rather than quits
;  when you press the global shortcut). Either case leaves the installer stuck
;  on "E.V. cannot be closed. Please close it manually and click Retry."
;
;  Overriding the macro to terminate the process tree outright avoids the dead
;  end. /t takes the children with it, /f does not ask.
; ---------------------------------------------------------------------------

!macro customCheckAppRunning
  DetailPrint "Closing any running copy of E.V...."
  nsExec::Exec 'taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}"'
  Pop $0
  Sleep 1200
!macroend
