# PureAir Production Secrets Generator (PowerShell)
# Run this script to generate secure secrets for production deployment

Write-Host "🔒 PureAir Production Secrets Generator" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Create output directory
$secretsDir = ".\secrets"
if (-not (Test-Path $secretsDir)) {
    New-Item -ItemType Directory -Path $secretsDir | Out-Null
}

Set-Location $secretsDir

Write-Host ""
Write-Host "📝 Generating strong random secrets..." -ForegroundColor Yellow

# Function to generate random hex string
function Generate-RandomHex {
    param([int]$Length)
    $bytes = New-Object byte[] ($Length / 2)
    (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
    ($bytes | ForEach-Object { $_.ToString("X2") }) -join ''
}

# Generate secrets
$JWT_SECRET = Generate-RandomHex -Length 128  # 64 characters in hex
Write-Host "✅ JWT_SECRET generated" -ForegroundColor Green

$MQTT_PASSWORD = Generate-RandomHex -Length 64  # 32 characters in hex
Write-Host "✅ MQTT_PASSWORD generated" -ForegroundColor Green

$PURPLEAIR_API_KEY = Generate-RandomHex -Length 64  # 32 characters in hex
Write-Host "✅ PURPLEAIR_API_KEY generated" -ForegroundColor Green

$MONGO_ROOT_PASSWORD = Generate-RandomHex -Length 64  # 32 characters in hex
Write-Host "✅ MONGO_ROOT_PASSWORD generated" -ForegroundColor Green

$MONGO_APP_PASSWORD = Generate-RandomHex -Length 64  # 32 characters in hex
Write-Host "✅ MONGO_APP_PASSWORD generated" -ForegroundColor Green

$REDIS_PASSWORD = Generate-RandomHex -Length 64  # 32 characters in hex
Write-Host "✅ REDIS_PASSWORD generated" -ForegroundColor Green

Write-Host ""
Write-Host "📄 Creating .env file template..." -ForegroundColor Yellow

# Create .env file template
$envTemplate = @"
# ============================================================================
# PUREAIR MONITORING SYSTEM - PRODUCTION SECRETS
# ============================================================================
# Generated on: $(Get-Date)
# WARNING: Keep this file secure. Never commit to version control.
# ============================================================================

# JWT Authentication
JWT_SECRET=$JWT_SECRET

# MQTT Broker Security
MQTT_PASSWORD=$MQTT_PASSWORD

# PurpleAir Integration
PURPLEAIR_API_KEY=$PURPLEAIR_API_KEY

# Database Credentials
MONGO_ROOT_PASSWORD=$MONGO_ROOT_PASSWORD
MONGO_APP_PASSWORD=$MONGO_APP_PASSWORD

# Redis Cache
REDIS_PASSWORD=$REDIS_PASSWORD

# Email Configuration (Set these manually)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend Configuration (Set these manually)
FRONTEND_URL=https://your-domain.com
"@

Set-Content -Path ".env.template" -Value $envTemplate

Write-Host ""
Write-Host "📄 Creating docker-compose .env file..." -ForegroundColor Yellow

# Create docker-compose environment file
$dockerEnv = @"
# Docker Compose Environment Variables
MONGO_ROOT_PASSWORD=$MONGO_ROOT_PASSWORD
MONGO_APP_PASSWORD=$MONGO_APP_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
MQTT_PASSWORD=$MQTT_PASSWORD
PURPLEAIR_API_KEY=$PURPLEAIR_API_KEY
FRONTEND_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
"@

Set-Content -Path ".env" -Value $dockerEnv

# Create backup of existing .env file if it exists
$backendEnvPath = "..\backend\.env"
if (Test-Path $backendEnvPath) {
    $backupName = "..\backend\.env.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $backendEnvPath $backupName
    Write-Host "✅ Backed up existing backend/.env file" -ForegroundColor Green
}

Write-Host ""
Write-Host "📄 Updating backend/.env file..." -ForegroundColor Yellow

# Update backend .env file
$backendEnv = @"
# ============================================================================
# PUREAIR MONITORING SYSTEM - PRODUCTION ENVIRONMENT CONFIGURATION
# ============================================================================
# WARNING: This file contains secrets - never commit to version control
# ============================================================================

# Server Configuration
PORT=5002
NODE_ENV=production

# ============================================================================
# DATABASE CONFIGURATION - PRODUCTION WITH AUTHENTICATION
# ============================================================================
MONGODB_URI=mongodb://pureair_app:$MONGO_APP_PASSWORD@mongodb:27017/hospital_aqi?authSource=admin

# ============================================================================
# SECURITY CREDENTIALS
# ============================================================================
JWT_SECRET=$JWT_SECRET

# MQTT Broker Security
MQTT_PORT=1886
MQTT_BROKER_URL=mqtt://pureair-backend:1886
MQTT_USERNAME=hospital_node
MQTT_PASSWORD=$MQTT_PASSWORD

# ============================================================================
# REDIS CONFIGURATION
# ============================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# ============================================================================
# EMAIL CONFIGURATION (Required for password reset)
# ============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ============================================================================
# FRONTEND & CORS CONFIGURATION
# ============================================================================
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

# ============================================================================
# PURPLEAIR INTEGRATION
# ============================================================================
PURPLEAIR_LOCAL_IP=
PURPLEAIR_POLL_INTERVAL=30
PURPLEAIR_NODE_ID=PurpleAir-PA-II
PURPLEAIR_ROOM_ID=PurpleAir-Zone
PURPLEAIR_API_KEY=$PURPLEAIR_API_KEY

# ============================================================================
# SECURITY ENHANCEMENTS
# ============================================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT_MINUTES=60
JWT_EXPIRY_HOURS=24
BEHIND_HTTPS_PROXY=true

# ============================================================================
# BACKUP CONFIGURATION
# ============================================================================
BACKUP_DIR=./backups
BACKUP_CRON_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
"@

Set-Content -Path $backendEnvPath -Value $backendEnv

Write-Host ""
Write-Host "✅ Secrets generation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   1. Review and update the generated files:" -ForegroundColor Yellow
Write-Host "      - .\secrets\.env.template (reference for all secrets)" -ForegroundColor White
Write-Host "      - .\secrets\.env (for docker-compose)" -ForegroundColor White
Write-Host "      - .\backend\.env (for application)" -ForegroundColor White
Write-Host ""
Write-Host "   2. Update the following configuration:" -ForegroundColor Yellow
Write-Host "      - FRONTEND_URL: Set to your actual domain" -ForegroundColor White
Write-Host "      - SMTP_USER/SMTP_PASS: Configure email for password reset" -ForegroundColor White
Write-Host ""
Write-Host "   3. Secure the secrets directory:" -ForegroundColor Yellow
Write-Host "      Remove unnecessary read permissions from secrets folder" -ForegroundColor White
Write-Host ""
Write-Host "   4. Deploy using:" -ForegroundColor Yellow
Write-Host "      docker-compose -f docker-compose.production.yml up -d" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT SECURITY NOTES:" -ForegroundColor Red
Write-Host "   - Never commit .env files or the secrets directory to version control" -ForegroundColor Yellow
Write-Host "   - Restrict access to the secrets directory" -ForegroundColor Yellow
Write-Host "   - Rotate secrets periodically (every 90 days recommended)" -ForegroundColor Yellow
Write-Host "   - Use different passwords for different environments" -ForegroundColor Yellow

# Return to original directory
Set-Location ..