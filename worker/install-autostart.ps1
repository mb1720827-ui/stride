# Makes the Stride worker start automatically, hidden, whenever you log in to Windows. Run once:
#   powershell -ExecutionPolicy Bypass -File worker\install-autostart.ps1
# Start it now without logging out:  Start-ScheduledTask -TaskName "Stride worker"
# Stop it:                           Stop-ScheduledTask -TaskName "Stride worker"
# Remove it:                         Unregister-ScheduledTask -TaskName "Stride worker" -Confirm:$false
$script = Join-Path $PSScriptRoot "start-worker.ps1"
# conhost --headless: no window at all. Plain "powershell -WindowStyle Hidden" gets handed to Windows Terminal on
# Windows 11 and shows a cmd.exe window, and closing that window stops the worker.
$action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT30S" # give Wi-Fi a moment to connect
# Every 5 minutes: starts the worker again if it has stopped for any reason (a running one is left alone: IgnoreNew).
$watchdog = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "Stride worker" -Action $action -Trigger $trigger, $watchdog -Settings $settings `
  -Description "Drafts Stride plans, quizzes and weekly reviews. Logs: worker.log in the project folder." -Force | Out-Null
Write-Output "Done: the Stride worker will start automatically when you log in, and restart within 5 minutes if it ever stops."
