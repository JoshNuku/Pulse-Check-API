import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

export function readPersistedMonitors() {
  try {
    const filePath = path.resolve(config.PERSISTENCE_PATH);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('[Persistence Error] Failed to read monitors from disk:', err.message);
    return [];
  }
}

export function writePersistedMonitors(monitors) {
  try {
    const filePath = path.resolve(config.PERSISTENCE_PATH);
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(monitors, null, 2), 'utf8');
  } catch (err) {
    console.error('[Persistence Error] Failed to write monitors to disk:', err.message);
  }
}

export async function writePersistedMonitorsAsync(monitors) {
  try {
    const filePath = path.resolve(config.PERSISTENCE_PATH);
    const tempPath = `${filePath}.tmp`;
    const dirPath = path.dirname(filePath);

    await fs.promises.mkdir(dirPath, { recursive: true });
    await fs.promises.writeFile(tempPath, JSON.stringify(monitors, null, 2), 'utf8');
    await fs.promises.rename(tempPath, filePath); // Atomic rename!
  } catch (err) {
    console.error('[Persistence Error] Failed to write monitors asynchronously to disk:', err.message);
    throw err;
  }
}