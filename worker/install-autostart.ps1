# Makes the Stride worker start automatically, hidden, whenever you log in to Windows. Run once:
#   powershell -ExecutionPolicy Bypass -File worker\install-autostart.ps1
# Start it now without logging out:  Start-ScheduledTask -TaskName "Stride worker"
# Stop it:                           Stop-ScheduledTask -TaskName "Stride worker"
# Remove it:                         Unregister-ScheduledTask -TaskName "Stride worker" -Confirm:$false
$script = Join-Path $PSScriptRoot "start-worker.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT30S" # give Wi-Fi a moment to connect
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "Stride worker" -Action $action -Trigger $trigger -Settings $settings `
  -Description "Drafts Stride plans, quizzes and weekly reviews. Logs: worker.log in the project folder." -Force | Out-Null
Write-Output "Done: the Stride worker will start automatically when you log in."
