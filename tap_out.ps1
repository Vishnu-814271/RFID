param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$CardUid = "CARD_STU_2006"
)

powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\simulate_tap.ps1" -CardUid $CardUid -Out
