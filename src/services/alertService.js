import { queueWebhookDispatch } from './retryQueue.js';
import { queueEmail } from './emailWorker.js';

export function triggerDowntimeAlert(monitor, customReason = null) {
  const timestamp = new Date().toISOString();

  // Core Requirement: standard console log JSON
  const alertPayload = {
    ALERT: `Device ${monitor.id} is down!`,
    time: timestamp,
  };

  if (customReason) {
    alertPayload.reason = customReason;
  }

  console.log(JSON.stringify(alertPayload));

  // Async Email Dispatch
  queueEmail(
    monitor.alert_email,
    `[URGENT] Device ${monitor.id} is DOWN!`,
    `Sentinel Watchdog Alert:\n\nDevice ${monitor.id} failed to check in.\nTime: ${timestamp}\nReason: ${customReason || 'Timer reached zero without heartbeat'}`
  );

  // Unique Feature: Webhook integration
  if (monitor.webhook_url) {
    const webhookPayload = {
      event: 'device_down',
      monitor_id: monitor.id,
      alert_email: monitor.alert_email,
      last_ping: monitor.last_ping ? new Date(monitor.last_ping).toISOString() : null,
      expires_at: monitor.expires_at ? new Date(monitor.expires_at).toISOString() : null,
      timestamp,
      reason: customReason || 'Timer reached zero without heartbeat',
    };

    queueWebhookDispatch(monitor.id, monitor.webhook_url, webhookPayload);
  }
}

export function triggerEscalationAlert(monitor) {
  const timestamp = new Date().toISOString();

  // Unique Feature: Multi-stage escalation logging
  const escalationPayload = {
    ESCALATION: `Device ${monitor.id} remains DOWN after twice the timeout limit!`,
    time: timestamp,
    primary_alert_email: monitor.alert_email,
    backup_alert_email: monitor.backup_email || 'none',
  };

  console.log(JSON.stringify(escalationPayload));

  // Async Email Dispatch to Backup Contact
  if (monitor.backup_email) {
    queueEmail(
      monitor.backup_email,
      `[ESCALATION] Device ${monitor.id} remains DOWN!`,
      `Sentinel Escalation Alert:\n\nDevice ${monitor.id} has remained offline for twice its timeout duration.\nPlease investigate immediately!\nTime: ${timestamp}\nPrimary Contact: ${monitor.alert_email}`
    );
  }

  if (monitor.webhook_url) {
    const webhookPayload = {
      event: 'device_escalated',
      monitor_id: monitor.id,
      alert_email: monitor.alert_email,
      backup_email: monitor.backup_email || null,
      timestamp,
      reason: 'Device remained in down state for 2x timeout duration',
    };

    queueWebhookDispatch(monitor.id, monitor.webhook_url, webhookPayload);
  }
}

export function triggerRecoveryAlert(monitor) {
  const timestamp = new Date().toISOString();

  // Console Log standard JSON
  const recoveryPayload = {
    RECOVERY: `Device ${monitor.id} is back online!`,
    time: timestamp,
  };

  console.log(JSON.stringify(recoveryPayload));

  // Async Email Dispatch
  queueEmail(
    monitor.alert_email,
    `[RESOLVED] Device ${monitor.id} is back online!`,
    `Sentinel Watchdog Alert:\n\nDevice ${monitor.id} has successfully checked in and recovered to active status.\nTime: ${timestamp}\nLast Ping Received: ${monitor.last_ping ? new Date(monitor.last_ping).toISOString() : 'N/A'}`
  );

  // Webhook integration
  if (monitor.webhook_url) {
    const webhookPayload = {
      event: 'device_recovered',
      monitor_id: monitor.id,
      alert_email: monitor.alert_email,
      last_ping: monitor.last_ping ? new Date(monitor.last_ping).toISOString() : null,
      timestamp,
    };

    queueWebhookDispatch(monitor.id, monitor.webhook_url, webhookPayload);
  }
}