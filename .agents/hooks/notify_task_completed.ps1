# Script: notify_task_completed.ps1
# Phát âm thanh thông báo "ting" khi AI Agent hoàn thành tác vụ (Stop event)

try {
    # 1. Phát âm thanh chuông Windows Ding / Notify quen thuộc
    $soundFiles = @(
        "C:\Windows\Media\Windows Ding.wav",
        "C:\Windows\Media\ding.wav",
        "C:\Windows\Media\Windows Notify.wav",
        "C:\Windows\Media\notify.wav",
        "C:\Windows\Media\chimes.wav"
    )

    $played = $false
    foreach ($file in $soundFiles) {
        if (Test-Path $file) {
            $player = New-Object System.Media.SoundPlayer $file
            $player.PlaySync()
            $played = $true
            break
        }
    }

    if (-not $played) {
        [System.Media.SystemSounds]::Asterisk.Play()
    }
} catch {
    # 2. Fallback âm thanh phần cứng nếu driver audio nền bị chặn
    try {
        [System.Console]::Beep(1000, 200)
    } catch {}
}

# Xuất kết quả JSON hợp lệ ra stdout theo chuẩn Antigravity Hook Contract
Write-Output '{"decision": "allow"}'
