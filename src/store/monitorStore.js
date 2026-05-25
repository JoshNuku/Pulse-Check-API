import { readPersistedMonitors, writePersistedMonitorsAsync } from './persistence.js';

// In-memory cache
const monitorsMap = new Map();

export function saveMonitor(monitor) {
  monitorsMap.set(monitor.id, monitor);
  persist();
  return monitor;
}

export function getMonitor(id) {
  return monitorsMap.get(id);
}

export function deleteMonitor(id) {
  const existed = monitorsMap.delete(id);
  if (existed) {
    persist();
  }
  return existed;
}

export function getAllMonitors() {
  return Array.from(monitorsMap.values());
}

export function loadMonitorsFromDisk() {
  const loaded = readPersistedMonitors();
  monitorsMap.clear();
  for (const monitor of loaded) {
    monitorsMap.set(monitor.id, monitor);
  }
  console.log(`[Store] Loaded ${monitorsMap.size} monitors from disk.`);
  return Array.from(monitorsMap.values());
}

let isWriting = false;
let pendingWrite = false;

async function persist() {
  if (isWriting) {
    pendingWrite = true;
    return;
  }
  isWriting = true;
  try {
    const all = Array.from(monitorsMap.values());
    await writePersistedMonitorsAsync(all);
  } catch (err) {
    console.error('[Store Error] Disk persistence failed:', err.message);
  } finally {
    isWriting = false;
    if (pendingWrite) {
      pendingWrite = false;
      persist(); // Drain next update
    }
  }
}