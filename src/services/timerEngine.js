import { getMonitor, saveMonitor, getAllMonitors } from '../store/monitorStore.js';
import { triggerDowntimeAlert, triggerEscalationAlert } from './alertService.js';
import { scheduleEscalation, clearEscalation } from './escalation.js';
import { config } from '../config/env.js';


const activeTimers = new Map();

export function startTimer(id, timeoutSecs) {
  clearTimer(id);
  clearEscalation(id);

  const monitor = getMonitor(id);
  if (!monitor) return;

  const now = Date.now();
  const delayMs = timeoutSecs * 1000;

  monitor.status = 'active';
  monitor.last_ping = now;
  monitor.expires_at = now + delayMs;
  monitor.paused_remaining_ms = null;
  saveMonitor(monitor);

  scheduleTimeout(id, delayMs);
}

export function scheduleRemainingTimer(id, remainingMs, expiresAt) {
  clearTimer(id);
  clearEscalation(id);

  const monitor = getMonitor(id);
  if (!monitor) return;

  monitor.status = 'active';
  monitor.expires_at = expiresAt;
  saveMonitor(monitor);

  scheduleTimeout(id, remainingMs);
}

function scheduleTimeout(id, delayMs) {
  const timerHandle = setTimeout(() => {
    const monitor = getMonitor(id);
    if (monitor && monitor.status === 'active') {
      monitor.status = 'down';
      saveMonitor(monitor);
      triggerDowntimeAlert(monitor);
      scheduleEscalation(id, monitor.timeout * (config.ESCALATION_MULTIPLIER - 1));
    }
    activeTimers.delete(id);
  }, delayMs);

  activeTimers.set(id, timerHandle);
}

export function clearTimer(id) {
  if (activeTimers.has(id)) {
    clearTimeout(activeTimers.get(id));
    activeTimers.delete(id);
    console.log(`[Timer Engine] Cleared countdown timer for monitor ${id}`);
  }
}

export function resetTimer(id) {
  const monitor = getMonitor(id);
  if (!monitor) return false;

  startTimer(id, monitor.timeout);
  return true;
}

export function pauseTimer(id) {
  const monitor = getMonitor(id);
  if (!monitor || (monitor.status !== 'active' && monitor.status !== 'down' && monitor.status !== 'escalated')) return false;

  clearTimer(id);
  clearEscalation(id);

  const now = Date.now();
  const remaining = Math.max(0, (monitor.expires_at || 0) - now);

  monitor.status = 'paused';
  monitor.paused_remaining_ms = remaining;
  saveMonitor(monitor);

  console.log(`[Timer Engine] Paused monitor ${id} with ${remaining}ms remaining`);
  return true;
}

export function initializeRecovery() {
  console.log('[Timer Engine] Starting Zero-Loss Recovery checks...');
  const monitors = getAllMonitors();
  const now = Date.now();

  for (const monitor of monitors) {
    if (monitor.status === 'active') {
      const expiresAt = monitor.expires_at;
      if (expiresAt <= now) {
        monitor.status = 'down';
        saveMonitor(monitor);
        triggerDowntimeAlert(monitor, 'Missed check-in during server offline period');

        const timeSinceLastPing = now - (monitor.last_ping || now);
        const escalationThreshold = monitor.timeout * config.ESCALATION_MULTIPLIER * 1000;
        if (timeSinceLastPing >= escalationThreshold) {
          monitor.status = 'escalated';
          saveMonitor(monitor);
          triggerEscalationAlert(monitor);
        } else {
          const remainingEscalationMs = escalationThreshold - timeSinceLastPing;
          scheduleEscalation(monitor.id, Math.ceil(remainingEscalationMs / 1000));
        }
      } else {
        const remainingMs = expiresAt - now;
        console.log(`[Recovery] Rescheduling monitor ${monitor.id} for remaining ${remainingMs}ms`);
        scheduleRemainingTimer(monitor.id, remainingMs, expiresAt);
      }
    } else if (monitor.status === 'down') {
      const timeSinceLastPing = now - (monitor.last_ping || now);
      const escalationThreshold = monitor.timeout * config.ESCALATION_MULTIPLIER * 1000;
      if (timeSinceLastPing >= escalationThreshold) {
        monitor.status = 'escalated';
        saveMonitor(monitor);
        triggerEscalationAlert(monitor);
      } else {
        const remainingEscalationMs = escalationThreshold - timeSinceLastPing;
        scheduleEscalation(monitor.id, Math.ceil(remainingEscalationMs / 1000));
      }
    }
  }
}