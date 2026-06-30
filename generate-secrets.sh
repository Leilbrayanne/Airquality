#!/bin/bash

# PureAir Production Secrets Generator
# Run this script to generate secure secrets for production deployment

echo "🔒 PureAir Production Secrets Generator"
echo "======================================="

# Check for required tools
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL is required but not installed. Please install OpenSSL first."
    exit 1
fi

# Create output directory
mkdir -p ./secrets
cd ./secrets

echo ""
echo "📝 Generating strong random secrets..."

# Generate JWT Secret (64 characters)
JWT_SECRET=$(openssl rand -hex 64)
echo "✅ JWT_SECRET generated"

# Generate MQTT Password (32 characters)
MQTT_PASSWORD=$(openssl rand -hex 32)
echo "✅ MQTT_PASSWORD generated"

# Generate PurpleAir API Key (32 characters)
PURPLEAIR_API_KEY=$(openssl rand -hex 32)
echo "✅ PURPLEAIR_API_KEY generated"

# Generate MongoDB root password (32 characters)
MONGO_ROOT_PASSWORD=$(openssl rand -hex 32)
echo "✅ MONGO_ROOT_PASSWORD generated"

# Generate MongoDB app password (32 characters)
MONGO_APP_PASSWORD=$(openssl rand -hex 32)
echo "✅ MONGO_APP_PASSWORD generated"

# Generate Redis password (32 characters)
REDIS_PASSWORD=$(openssl rand -hex 32)
echo "✅ REDIS_PASSWORD generated"

# Create .env file template
echo ""
echo "📄 Creating .env file template..."
cat > .env.template << EOF
# ============================================================================
# PUREAIR MONITORING SYSTEM - PRODUCTION SECRETS
# ============================================================================
# Generated on: $(date)
# WARNING: Keep this file secure. Never commit to version control.
# ============================================================================

# JWT Authentication
JWT_SECRET=${JWT_SECRET}

# MQTT Broker Security
MQTT_PASSWORD=${MQTT_PASSWORD}

# PurpleAir Integration
PURPLEAIR_API_KEY=${PURPLEAIR_API_KEY}

# Database Credentials
MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
MONGO_APP_PASSWORD=${MONGO_APP_PASSWORD}

# Redis Cache
REDIS_PASSWORD=${REDIS_PASSWORD}

# Email Configuration (Set these manually)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend Configuration (Set these manually)
FRONTEND_URL=https://your-domain.com
EOF

# Create docker-compose environment file
echo ""
echo "📄 Creating docker-compose .env file..."
cat > .env << EOF
# Docker Compose Environment Variables
MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
MONGO_APP_PASSWORD=${MONGO_APP_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
MQTT_PASSWORD=${MQTT_PASSWORD}
PURPLEAIR_API_KEY=${PURPLEAIR_API_KEY}
FRONTEND_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EOF

# Create backup of existing .env file if it exists
if [ -f "../backend/.env" ]; then
    cp "../backend/.env" "../backend/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backed up existing backend/.env file"
fi

# Update backend .env file
echo ""
echo "📄 Updating backend/.env file..."
cat > ../backend/.env << EOF
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
MONGODB_URI=mongodb://pureair_app:${MONGO_APP_PASSWORD}@mongodb:27017/hospital_aqi?authSource=admin

# ============================================================================
# SECURITY CREDENTIALS
# ============================================================================
JWT_SECRET=${JWT_SECRET}

# MQTT Broker Security
MQTT_PORT=1886
MQTT_BROKER_URL=mqtt://pureair-backend:1886
MQTT_USERNAME=hospital_node
MQTT_PASSWORD=${MQTT_PASSWORD}

# ============================================================================
# REDIS CONFIGURATION
# ============================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

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
PURPLEAIR_API_KEY=${PURPLEAIR_API_KEY}

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
EOF

echo ""
echo "✅ Secrets generation completed!"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Review and update the generated files:"
echo "      - ./secrets/.env.template (reference for all secrets)"
echo "      - ./secrets/.env (for docker-compose)"
echo "      - ./backend/.env (for application)"
echo ""
echo "   2. Update the following configuration:"
echo "      - FRONTEND_URL: Set to your actual domain"
echo "      - SMTP_USER/SMTP_PASS: Configure email for password reset"
echo ""
echo "   3. Secure the secrets directory:"
echo "      chmod 600 ./secrets/*"
echo "      Consider encrypting the secrets directory"
echo ""
echo "   4. Deploy using:"
echo "      docker-compose -f docker-compose.production.yml up -d"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   - Never commit .env files or the secrets directory to version control"
echo "   - Restrict access to the secrets directory"
echo "   - Rotate secrets periodically (every 90 days recommended)"
echo "   - Use different passwords for different environments"