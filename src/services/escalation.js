import { getMonitor, saveMonitor } from '../store/monitorStore.js';
import { triggerEscalationAlert } from './alertService.js';

// Map of active escalation timers
const escalationTimers = new Map();

export function scheduleEscalation(id, timeoutSecs) {
  clearEscalation(id);

  const delayMs = timeoutSecs * 1000;
  console.log(`[Escalation] Scheduling escalation check for monitor ${id} in ${timeoutSecs}s`);

  const timerHandle = setTimeout(() => {
    const monitor = getMonitor(id);
    if (monitor && monitor.status === 'down') {
      monitor.status = 'escalated';
      saveMonitor(monitor);
      triggerEscalationAlert(monitor);
    }
    escalationTimers.delete(id);
  }, delayMs);

  escalationTimers.set(id, timerHandle);
}

export function clearEscalation(id) {
  if (escalationTimers.has(id)) {
    clearTimeout(escalationTimers.get(id));
    escalationTimers.delete(id);
    console.log(`[Escalation] Cleared escalation check for monitor ${id}`);
  }
}