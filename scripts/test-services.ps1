# ==============================================================================
# ShopFlow - Script Kiểm Tra Kết Nối Docker Services (PowerShell)
# File: scripts/test-services.ps1
# ==============================================================================
#
# MỤC ĐÍCH:
#   Kiểm tra trạng thái khởi động và kết nối của PostgreSQL và Redis
#   trong môi trường Docker để đảm bảo TASK-02 hoàn thành đúng chuẩn.
#
# CÁCH DÙNG:
#   1. Đảm bảo Docker Desktop đang chạy.
#   2. Đảm bảo các container đã được khởi động:
#      docker-compose --env-file .env.docker up -d
#   3. Chạy script này:
#      .\scripts\test-services.ps1
# ==============================================================================

param(
    [string]$EnvFile = ".env.docker",
    [int]$MaxRetries = 30,
    [int]$RetryInterval = 2
)

# --- Màu sắc terminal ---
$ColorReset  = "`e[0m"
$ColorGreen  = "`e[32m"
$ColorRed    = "`e[31m"
$ColorYellow = "`e[33m"
$ColorCyan   = "`e[36m"
$ColorBold   = "`e[1m"

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "${ColorBold}${ColorCyan}══════════════════════════════════════════════════${ColorReset}"
    Write-Host "${ColorBold}${ColorCyan}  $Text${ColorReset}"
    Write-Host "${ColorBold}${ColorCyan}══════════════════════════════════════════════════${ColorReset}"
}

function Write-Success {
    param([string]$Text)
    Write-Host "  ${ColorGreen}✔  $Text${ColorReset}"
}

function Write-Failure {
    param([string]$Text)
    Write-Host "  ${ColorRed}✘  $Text${ColorReset}"
}

function Write-Info {
    param([string]$Text)
    Write-Host "  ${ColorYellow}→  $Text${ColorReset}"
}

# --- Đọc biến môi trường từ file ---
function Read-EnvFile {
    param([string]$FilePath)
    $envVars = @{}
    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
                $key   = $Matches[1].Trim()
                $value = $Matches[2].Trim().Trim('"').Trim("'")
                $envVars[$key] = $value
            }
        }
    }
    return $envVars
}

# === MAIN ===
Write-Header "ShopFlow - Docker Services Health Check"
Write-Host ""
Write-Info "Đọc cấu hình từ: $EnvFile"

# Kiểm tra tệp môi trường
$envFilePath = Join-Path (Split-Path $MyInvocation.MyCommand.Path) ".." $EnvFile
if (-not (Test-Path $envFilePath)) {
    # Thử đường dẫn tương đối từ thư mục gốc
    $envFilePath = $EnvFile
}

if (-not (Test-Path $envFilePath)) {
    Write-Failure "Không tìm thấy file $EnvFile!"
    Write-Info "Hãy sao chép: copy .env.docker.example .env.docker"
    exit 1
}

$env = Read-EnvFile -FilePath $envFilePath

# Lấy thông tin cấu hình
$pgHost     = "localhost"
$pgPort     = if ($env["POSTGRES_PORT"]) { $env["POSTGRES_PORT"] } else { "5432" }
$pgDb       = if ($env["POSTGRES_DB"])   { $env["POSTGRES_DB"] }   else { "shopflow_db" }
$pgUser     = if ($env["POSTGRES_USER"]) { $env["POSTGRES_USER"] } else { "shopflow_user" }
$pgPass     = if ($env["POSTGRES_PASSWORD"]) { $env["POSTGRES_PASSWORD"] } else { "shopflow_secret_2024" }
$redisHost  = "localhost"
$redisPort  = if ($env["REDIS_PORT"])     { $env["REDIS_PORT"] }     else { "6379" }
$redisPass  = if ($env["REDIS_PASSWORD"]) { $env["REDIS_PASSWORD"] } else { "redis_secret_2024" }

Write-Success "Cấu hình đọc thành công"
Write-Host ""

# ==============================================================================
# KIỂM TRA 1: Docker daemon
# ==============================================================================
Write-Header "1. Kiểm tra Docker Daemon"
try {
    $dockerVersion = docker version --format "{{.Server.Version}}" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker đang chạy - phiên bản server: $dockerVersion"
    } else {
        throw "Docker không phản hồi"
    }
} catch {
    Write-Failure "Docker Desktop chưa khởi động hoặc không cài đặt!"
    Write-Info "Hãy mở Docker Desktop và chờ đến khi engine sẵn sàng."
    exit 1
}

# ==============================================================================
# KIỂM TRA 2: Trạng thái container
# ==============================================================================
Write-Header "2. Kiểm tra Trạng Thái Container"

$containers = @("shopflow_postgres", "shopflow_redis")
$allRunning = $true

foreach ($container in $containers) {
    $status = docker inspect --format "{{.State.Status}}" $container 2>&1
    if ($LASTEXITCODE -eq 0 -and $status -eq "running") {
        $health = docker inspect --format "{{.State.Health.Status}}" $container 2>&1
        Write-Success "Container '$container' đang RUNNING (health: $health)"
    } else {
        Write-Failure "Container '$container' KHÔNG chạy (status: $status)"
        $allRunning = $false
    }
}

if (-not $allRunning) {
    Write-Host ""
    Write-Info "Để khởi động containers, chạy:"
    Write-Info "  docker-compose --env-file .env.docker up -d"
    exit 1
}

# ==============================================================================
# KIỂM TRA 3: Kết nối PostgreSQL (chờ healthcheck pass)
# ==============================================================================
Write-Header "3. Kiểm tra Kết Nối PostgreSQL"
Write-Info "Host: ${pgHost}:${pgPort} | Database: $pgDb | User: $pgUser"

$pgConnected = $false
for ($i = 1; $i -le $MaxRetries; $i++) {
    Write-Info "Thử kết nối lần $i/$MaxRetries..."

    # Thử kết nối TCP đến cổng PostgreSQL
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectResult = $tcpClient.BeginConnect($pgHost, [int]$pgPort, $null, $null)
        $waitResult = $connectResult.AsyncWaitHandle.WaitOne(3000, $false)
        if ($waitResult -and $tcpClient.Connected) {
            $tcpClient.Close()
            Write-Success "Cổng TCP ${pgHost}:${pgPort} phản hồi thành công!"
            $pgConnected = $true
            break
        }
        $tcpClient.Close()
    } catch {
        # Tiếp tục thử
    }

    Start-Sleep -Seconds $RetryInterval
}

if (-not $pgConnected) {
    Write-Failure "Không thể kết nối PostgreSQL sau $MaxRetries lần thử!"
    exit 1
}

# Kiểm tra pg_isready bên trong container
$pgReadyOutput = docker exec shopflow_postgres pg_isready -U $pgUser -d $pgDb 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "pg_isready: PostgreSQL đã sẵn sàng nhận kết nối!"
    Write-Success "Database '$pgDb' với user '$pgUser' hoạt động bình thường."
} else {
    Write-Failure "pg_isready thất bại: $pgReadyOutput"
    exit 1
}

# ==============================================================================
# KIỂM TRA 4: Kết nối Redis (chờ PING)
# ==============================================================================
Write-Header "4. Kiểm tra Kết Nối Redis"
Write-Info "Host: ${redisHost}:${redisPort}"

$redisConnected = $false
for ($i = 1; $i -le $MaxRetries; $i++) {
    Write-Info "Thử kết nối lần $i/$MaxRetries..."

    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectResult = $tcpClient.BeginConnect($redisHost, [int]$redisPort, $null, $null)
        $waitResult = $connectResult.AsyncWaitHandle.WaitOne(3000, $false)
        if ($waitResult -and $tcpClient.Connected) {
            $tcpClient.Close()
            Write-Success "Cổng TCP ${redisHost}:${redisPort} phản hồi thành công!"
            $redisConnected = $true
            break
        }
        $tcpClient.Close()
    } catch {
        # Tiếp tục thử
    }

    Start-Sleep -Seconds $RetryInterval
}

if (-not $redisConnected) {
    Write-Failure "Không thể kết nối Redis sau $MaxRetries lần thử!"
    exit 1
}

# Kiểm tra PING trong container Redis
$redisPingOutput = docker exec shopflow_redis redis-cli -a $redisPass ping 2>&1
if ($redisPingOutput -match "PONG") {
    Write-Success "Redis PING → PONG: Redis đang hoạt động bình thường!"
} else {
    Write-Failure "Redis PING thất bại: $redisPingOutput"
    exit 1
}

# Kiểm tra AOF persistence đã bật
$redisAofOutput = docker exec shopflow_redis redis-cli -a $redisPass config get appendonly 2>&1
if ($redisAofOutput -match "yes") {
    Write-Success "AOF Persistence: Đã bật (--appendonly yes)"
} else {
    Write-Info "Cảnh báo: AOF Persistence chưa xác nhận."
}

# ==============================================================================
# KẾT QUẢ TỔNG HỢP
# ==============================================================================
Write-Header "Kết Quả Kiểm Tra"
Write-Host ""
Write-Success "PostgreSQL 15-alpine  → OK  (localhost:$pgPort)"
Write-Success "Redis 7-alpine        → OK  (localhost:$redisPort)"
Write-Host ""
Write-Host "${ColorBold}${ColorGreen}  ✔  Tất cả dịch vụ Docker hoạt động bình thường!${ColorReset}"
Write-Host "${ColorBold}${ColorGreen}  ✔  TASK-02 đã hoàn thành xác minh thành công.${ColorReset}"
Write-Host ""
Write-Info "Connection strings để cập nhật vào backend/.env:"
Write-Host "  DATABASE_URL=postgresql://${pgUser}:${pgPass}@localhost:${pgPort}/${pgDb}"
Write-Host "  REDIS_URL=redis://:${redisPass}@localhost:${redisPort}"
Write-Host ""
