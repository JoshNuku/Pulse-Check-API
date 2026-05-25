import { getMonitor, saveMonitor, getAllMonitors } from '../store/monitorStore.js';
import { startTimer, resetTimer, pauseTimer } from '../services/timerEngine.js';
import { triggerRecoveryAlert } from '../services/alertService.js';
import { config } from '../config/env.js';

export function registerMonitor(req, res, next) {
  try {
    const { id, timeout, alert_email, webhook_url, backup_email } = req.body;

    const existing = getMonitor(id);
    if (existing) {
      return res.status(400).json({ error: `Monitor with ID ${id} already exists` });
    }

    const parsedTimeout = timeout !== undefined ? Number(timeout) : config.DEFAULT_TIMEOUT;

    const monitor = {
      id,
      timeout: parsedTimeout,
      alert_email,
      webhook_url: webhook_url || null,
      backup_email: backup_email || null,
      status: 'active',
      created_at: Date.now(),
      last_ping: Date.now(),
      expires_at: Date.now() + parsedTimeout * 1000,
      paused_remaining_ms: null,
    };

    saveMonitor(monitor);
    startTimer(id, parsedTimeout);

    res.status(201).json({
      message: 'Monitor registered successfully',
      monitor,
    });
  } catch (err) {
    next(err);
  }
}

export function heartbeatMonitor(req, res, next) {
  try {
    const { id } = req.params;

    const monitor = getMonitor(id);
    if (!monitor) {
      return res.status(404).json({ error: `Monitor with ID ${id} not found` });
    }

    const previousStatus = monitor.status;
    resetTimer(id);
    const updated = getMonitor(id);

    if (previousStatus === 'down' || previousStatus === 'escalated') {
      triggerRecoveryAlert(updated);
    }

    res.status(200).json({
      message: 'Heartbeat received. Timer reset.',
      monitor: updated,
    });
  } catch (err) {
    next(err);
  }
}

export function pauseMonitor(req, res, next) {
  try {
    const { id } = req.params;

    const monitor = getMonitor(id);
    if (!monitor) {
      return res.status(404).json({ error: `Monitor with ID ${id} not found` });
    }

    pauseTimer(id);

    res.status(200).json({
      message: 'Monitor paused successfully',
      monitor: getMonitor(id),
    });
  } catch (err) {
    next(err);
  }
}

export function getMonitors(req, res, next) {
  try {
    const monitors = getAllMonitors();
    res.status(200).json(monitors);
  } catch (err) {
    next(err);
  }
}