import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export const createBackup = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupPath = path.join(backupDir, `backup-${timestamp}`);

  // Ensure backup directory exists
  await fs.mkdir(backupDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-disaster-response';
    const dbName = mongodbUri.split('/').pop();

    const mongodump = spawn('mongodump', [
      `--uri=${mongodbUri}`,
      `--archive=${backupPath}`,
      '--gzip',
    ]);

    mongodump.stderr.on('data', (data) => {
      console.log(`mongodump: ${data}`);
    });

    mongodump.on('error', (error) => {
      console.error('Failed to start mongodump:', error);
      reject(error);
    });

    mongodump.on('close', (code) => {
      if (code === 0) {
        resolve(backupPath);
      } else {
        reject(new Error(`mongodump exited with code ${code}`));
      }
    });
  });
};
