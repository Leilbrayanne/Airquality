#!/usr/bin/env node

/**
 * Database Backup Script for PureAir Monitoring System
 * Run daily via cron: 0 2 * * * /path/to/backend/scripts/backup.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  /**
   * Create backup directory if it doesn't exist
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Extract database name from MongoDB URI
   */
  getDatabaseName() {
    const match = this.mongoUri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'hospital_aqi';
  }

  /**
   * Build mongodump command with authentication if needed
   */
  buildMongoDumpCommand() {
    const dbName = this.getDatabaseName();
    const backupPath = path.join(this.backupDir, `mongodb_backup_${this.timestamp}`);
    
    let command = `mongodump`;
    
    // Add URI
    command += ` --uri="${this.mongoUri}"`;
    
    // Add output directory
    command += ` --out="${backupPath}"`;
    
    // Add other options
    command += ` --gzip`;
    command += ` --quiet`;
    
    return { command, backupPath };
  }

  /**
   * Create compressed tar archive of backup
   */
  createArchive(backupPath) {
    const archiveName = `backup_${this.timestamp}.tar.gz`;
    const archivePath = path.join(this.backupDir, archiveName);
    const archiveCommand = `tar -czf "${archivePath}" -C "${backupPath}" .`;
    
    return new Promise((resolve, reject) => {
      exec(archiveCommand, (error, stdout, stderr) => {
        if (error) {
          reject(`Archive creation failed: ${error.message}`);
          return;
        }
        console.log(`Created archive: ${archivePath}`);
        resolve(archivePath);
      });
    });
  }

  /**
   * Clean up temporary backup directory
   */
  cleanupTempDir(backupPath) {
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
      console.log(`Cleaned up temporary directory: ${backupPath}`);
    }
  }

  /**
   * Remove old backups based on retention policy
   */
  cleanupOldBackups() {
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        return { file, path: filePath, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime); // Sort newest first

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    let deletedCount = 0;
    files.forEach(({ file, path: filePath, mtime }) => {
      if (mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old backup: ${file}`);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} old backup(s)`);
    }
  }

  /**
   * Verify backup integrity
   */
  verifyBackup(archivePath) {
    return new Promise((resolve, reject) => {
      const verifyCommand = `tar -tzf "${archivePath}" | head -5`;
      
      exec(verifyCommand, (error, stdout, stderr) => {
        if (error) {
          reject(`Backup verification failed: ${error.message}`);
          return;
        }
        
        const files = stdout.trim().split('\n');
        if (files.length > 0 && files[0].includes('hospital_aqi/')) {
          console.log('Backup verification successful');
          console.log('Sample files in backup:', files);
          resolve(true);
        } else {
          reject('Backup appears to be empty or corrupted');
        }
      });
    });
  }

  /**
   * Log backup details to file
   */
  logBackupDetails(archivePath) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      backupFile: path.basename(archivePath),
      database: this.getDatabaseName(),
      size: fs.statSync(archivePath).size,
      retentionDays: this.retentionDays
    };

    const logFile = path.join(this.backupDir, 'backup_log.json');
    let logData = [];
    
    if (fs.existsSync(logFile)) {
      try {
        logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      } catch (e) {
        console.warn('Could not read existing log file, starting fresh');
      }
    }
    
    logData.push(logEntry);
    
    // Keep only last 1000 entries
    if (logData.length > 1000) {
      logData = logData.slice(-1000);
    }
    
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log('Backup logged to:', logFile);
  }

  /**
   * Send notification (stub - implement based on your notification system)
   */
  async sendNotification(success, message, archivePath) {
    // Implement based on your notification system
    // Example: Email, Slack, Discord, etc.
    
    const notification = {
      success,
      timestamp: new Date().toISOString(),
      system: 'PureAir Monitoring',
      message,
      backupFile: archivePath ? path.basename(archivePath) : null,
      size: archivePath ? fs.statSync(archivePath).size : null
    };
    
    console.log('Backup notification:', notification);
    
    // Example: Log to file for now
    const notificationFile = path.join(this.backupDir, 'notifications.json');
    let notifications = [];
    
    if (fs.existsSync(notificationFile)) {
      try {
        notifications = JSON.parse(fs.readFileSync(notificationFile, 'utf8'));
      } catch (e) {
        console.warn('Could not read notification file');
      }
    }
    
    notifications.push(notification);
    fs.writeFileSync(notificationFile, JSON.stringify(notifications, null, 2));
  }

  /**
   * Main backup execution
   */
  async execute() {
    console.log(`Starting backup at ${new Date().toISOString()}`);
    
    try {
      // 1. Ensure backup directory exists
      this.ensureBackupDir();
      
      // 2. Build and execute mongodump command
      const { command, backupPath } = this.buildMongoDumpCommand();
      console.log(`Executing: ${command}`);
      
      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            reject(`MongoDB backup failed: ${error.message}`);
            return;
          }
          console.log('MongoDB backup completed successfully');
          resolve();
        });
      });
      
      // 3. Create compressed archive
      const archivePath = await this.createArchive(backupPath);
      
      // 4. Verify backup integrity
      await this.verifyBackup(archivePath);
      
      // 5. Clean up temporary directory
      this.cleanupTempDir(backupPath);
      
      // 6. Remove old backups
      this.cleanupOldBackups();
      
      // 7. Log backup details
      this.logBackupDetails(archivePath);
      
      // 8. Send success notification
      await this.sendNotification(
        true,
        `Backup completed successfully: ${path.basename(archivePath)}`,
        archivePath
      );
      
      console.log(`Backup completed successfully: ${archivePath}`);
      console.log(`Backup size: ${(fs.statSync(archivePath).size / 1024 / 1024).toFixed(2)} MB`);
      
    } catch (error) {
      console.error('Backup failed:', error);
      
      // Send failure notification
      await this.sendNotification(false, `Backup failed: ${error}`, null);
      
      process.exit(1);
    }
  }

  /**
   * Restore from backup
   */
  async restore(backupFile) {
    const backupPath = path.join(this.backupDir, backupFile);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    console.log(`Restoring from backup: ${backupPath}`);
    
    // Extract archive
    const extractDir = path.join(this.backupDir, 'restore_temp');
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(extractDir, { recursive: true });
    
    const extractCommand = `tar -xzf "${backupPath}" -C "${extractDir}"`;
    
    await new Promise((resolve, reject) => {
      exec(extractCommand, (error, stdout, stderr) => {
        if (error) {
          reject(`Extraction failed: ${error.message}`);
          return;
        }
        console.log('Archive extracted successfully');
        resolve();
      });
    });
    
    // Find the database directory
    const dbName = this.getDatabaseName();
    const dumpDir = path.join(extractDir, dbName);
    
    if (!fs.existsSync(dumpDir)) {
      throw new Error(`Database directory not found in backup: ${dumpDir}`);
    }
    
    // Restore using mongorestore
    const restoreCommand = `mongorestore --uri="${this.mongoUri}" --drop "${dumpDir}"`;
    console.log(`Executing: ${restoreCommand}`);
    
    await new Promise((resolve, reject) => {
      exec(restoreCommand, (error, stdout, stderr) => {
        if (error) {
          reject(`Restore failed: ${error.message}`);
          return;
        }
        console.log('Database restore completed successfully');
        resolve();
      });
    });
    
    // Clean up
    fs.rmSync(extractDir, { recursive: true, force: true });
    console.log('Restore completed successfully');
  }
}

// Command line interface
if (require.main === module) {
  const backupManager = new BackupManager();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'restore':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('Usage: node backup.js restore <backup-file>');
        process.exit(1);
      }
      backupManager.restore(backupFile)
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Restore failed:', error);
          process.exit(1);
        });
      break;
      
    case 'list':
      const files = fs.readdirSync(backupManager.backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.tar.gz'))
        .map(file => {
          const filePath = path.join(backupManager.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            file,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
            date: stats.mtime.toISOString()
          };
        });
      
      console.log('Available backups:');
      files.forEach(f => console.log(`  ${f.date} - ${f.file} (${f.size})`));
      break;
      
    default:
      // Default action: create backup
      backupManager.execute()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Backup failed:', error);
          process.exit(1);
        });
  }
}

module.exports = BackupManager;