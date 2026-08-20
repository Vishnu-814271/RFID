<#
.SYNOPSIS
    Simulates RFID Card Tap IN and Tap OUT over MQTT with Authentication.
.DESCRIPTION
    Usage Examples:
    .\simulate_tap.ps1 -CardUid "CARD_STU_2006" -In
    .\simulate_tap.ps1 -CardUid "CARD_STU_2006" -Out
    .\simulate_tap.ps1 -CardUid "CARD_STU_2006" -ReaderId "READER_IN"
#>

param (
    [string]$CardUid = "CARD_STU_2006",
    [string]$ReaderId = "",
    [switch]$In,
    [switch]$Out,
    [string]$DeviceKey = "RFTSA085E3E85280",
    [string]$Broker = "localhost",
    [int]$Port = 1883,
    [string]$Topic = "rfid/taps",
    [string]$Username = "rfid_user",
    [string]$Password = "Vishnu@35"
)

# Determine Reader ID based on -In / -Out flags
if ($In) {
    $ReaderId = "READER_IN"
} elseif ($Out) {
    $ReaderId = "READER_OUT"
} elseif ([string]::IsNullOrWhiteSpace($ReaderId)) {
    $ReaderId = "READER_IN"
}

$ActionLabel = if ($ReaderId -like "*OUT*" -or $ReaderId -like "*EXIT*") { "TAP OUT (Check-Out)" } else { "TAP IN (Check-In)" }
$OccurredAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

$Payload = @{
    deviceKey  = $DeviceKey
    readerId   = $ReaderId
    cardUid    = $CardUid
    occurredAt = $OccurredAt
} | ConvertTo-Json -Compress

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " [MQTT RFID Simulator] $ActionLabel" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Broker     : ${Broker}:${Port}"
Write-Host " Username   : $Username"
Write-Host " Topic      : $Topic"
Write-Host " Card UID   : $CardUid"
Write-Host " Reader ID  : $ReaderId"
Write-Host " OccurredAt : $OccurredAt"
Write-Host " Payload    : $Payload"
Write-Host "------------------------------------------"

$MosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"

$AuthArgs = @()
if ($Username -and $Username.Trim() -ne "") {
    $AuthArgs += @("-u", $Username)
}
if ($Password -and $Password.Trim() -ne "") {
    $AuthArgs += @("-P", $Password)
}

$EscapedPayload = $Payload.Replace('"', '\"')

if (Test-Path $MosquittoPub) {
    & $MosquittoPub -h $Broker -p $Port @AuthArgs -t $Topic -m $EscapedPayload
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [SUCCESS] $ActionLabel successfully sent for card $CardUid!" -ForegroundColor Green
    } else {
        Write-Host " [ERROR] Failed to publish message (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
    }
} else {
    Write-Host " [WARNING] mosquitto_pub.exe not found at $MosquittoPub. Attempting via system PATH..." -ForegroundColor Yellow
    mosquitto_pub -h $Broker -p $Port @AuthArgs -t $Topic -m $EscapedPayload
}
