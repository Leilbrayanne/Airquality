# PureAir Production Deployment Checklist

## ✅ Pre-Deployment Security Audit Completed
- [x] All security issues identified and fixed
- [x] Security middleware properly configured
- [x] Authentication and authorization working
- [x] Rate limiting implemented
- [x] Input validation and sanitization in place
- [x] Secure headers configured
- [x] Logging without sensitive data

## 🔒 Step 1: Generate Production Secrets

### Windows (PowerShell):
```powershell
# Run as Administrator if needed
.\generate-secrets.ps1
```

### Linux/Mac:
```bash
chmod +x generate-secrets.sh
./generate-secrets.sh
```

**Output:** Secrets generated in `./secrets/` directory

## 📝 Step 2: Update Configuration Files

### Update these files with your actual values:

1. **Update `./secrets/.env` and `./backend/.env`:**
   - `FRONTEND_URL`: Your actual domain (e.g., `https://pureair.your-hospital.com`)
   - `SMTP_USER`: Your email for password reset notifications
   - `SMTP_PASS`: App password for email (not your regular password)

2. **Update `deployment/nginx.conf`:**
   - Replace `your-domain.com` with your actual domain (lines 7, 24)
   - Update SSL certificate paths if using custom certificates

## 🐳 Step 3: Build and Deploy with Docker

### Build all services:
```bash
docker-compose -f docker-compose.production.yml build
```

### Start the deployment:
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Check service status:
```bash
docker-compose -f docker-compose.production.yml ps
```

## 🧪 Step 4: Verify Deployment

### Health checks:
```bash
# Backend health
curl http://localhost:5002/health

# Frontend health
curl http://localhost:80

# Database connection
docker exec pureair-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Security verification:
```bash
# Check HTTPS redirect
curl -I http://your-domain.com

# Check security headers
curl -I https://your-domain.com

# Verify API access
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pureair.cm","password":"admin123"}'
```

## 🔧 Step 5: Initial Setup

### 1. Access the system:
- Open `https://your-domain.com` in browser
- Login with default credentials (from `backend/setup.js`)

### 2. Change default passwords:
- Immediately change all user passwords
- Consider creating new users with strong passwords
- Disable default users if not needed

### 3. Configure sensors:
- Register ESP32 sensor nodes
- Configure PurpleAir integration if using
- Set up room thresholds and alerts

## 📊 Step 6: Monitoring Setup

### Enable monitoring:
1. **Log monitoring:** Check Docker logs regularly
2. **Performance monitoring:** Use `/metrics` endpoint
3. **Alert monitoring:** Configure email notifications
4. **Backup monitoring:** Verify backups are running

### Check logs:
```bash
# Backend logs
docker logs pureair-backend -f

# Nginx logs
docker logs pureair-nginx -f

# Database logs
docker logs pureair-mongodb -f
```

## 🔄 Step 7: Backup Configuration

### Verify backup script:
```bash
# Test backup manually
docker exec pureair-backend node scripts/backup.js
```

### Schedule backups:
- Backups run daily at 2 AM (configured in `.env`)
- Verify backup files in `./backend/backups/`

## 🚨 Step 8: Emergency Procedures

### If something goes wrong:

1. **Stop services:**
   ```bash
   docker-compose -f docker-compose.production.yml down
   ```

2. **Check logs:**
   ```bash
   docker-compose -f docker-compose.production.yml logs
   ```

3. **Restore from backup:**
   ```bash
   # Stop services
   docker-compose -f docker-compose.production.yml down
   
   # Restore MongoDB
   docker exec pureair-mongodb mongorestore --uri="mongodb://pureair_admin:${MONGO_ROOT_PASSWORD}@localhost:27017" /backup/latest/
   
   # Restart services
   docker-compose -f docker-compose.production.yml up -d
   ```

## 📈 Step 9: Ongoing Maintenance

### Daily:
- [ ] Check service health
- [ ] Review error logs
- [ ] Verify backups

### Weekly:
- [ ] Review access logs
- [ ] Check disk space
- [ ] Update dependencies

### Monthly:
- [ ] Security patches
- [ ] Performance review
- [ ] Certificate renewal check

### Quarterly:
- [ ] Full security audit
- [ ] Password rotation
- [ ] Database optimization

## 📞 Support Information

### Service URLs:
- **Web Interface:** `https://your-domain.com`
- **API Documentation:** `https://your-domain.com/api/docs`
- **Health Check:** `https://your-domain.com/health`

### Container Information:
- **Backend:** Port 5002 (internal), 1886 (MQTT)
- **Frontend:** Port 80 (internal, proxied to 443)
- **Database:** Port 27017 (internal only)
- **Redis:** Port 6379 (internal only)

### Troubleshooting:
1. **Service won't start:** Check Docker logs
2. **Database connection:** Verify MongoDB is running
3. **SSL issues:** Check certificate paths and permissions
4. **Authentication:** Verify JWT_SECRET is set correctly

## ✅ Final Verification

Run the verification script:
```bash
# On the server
./verify-deployment.sh
```

Or manually verify:

1. **All services running:**
   ```bash
   docker-compose -f docker-compose.production.yml ps
   ```

2. **HTTPS working:**
   ```bash
   curl -k https://localhost/api/health
   ```

3. **Database accessible:**
   ```bash
   docker exec pureair-mongodb mongosh --eval "db.getCollectionNames()"
   ```

4. **Frontend loading:**
   Open `https://your-domain.com` and verify login page loads

## 🎉 Deployment Complete!

Your PureAir Monitoring System is now running in production. Remember to:

1. **Monitor regularly** - Use the provided monitoring endpoints
2. **Rotate secrets** - Every 90 days for production systems
3. **Keep backups** - Test restore procedures quarterly
4. **Stay updated** - Apply security patches promptly

For additional help, refer to:
- `backend/PRODUCTION_DEPLOYMENT.md` - Detailed security checklist
- `README.md` - System overview and API documentation
- Docker and Nginx logs for troubleshooting