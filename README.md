# Pulse-Check-API (Watchdog Sentinel)

A high-reliability Dead Man's Switch API. Devices register a countdown timer. If the device fails to check in before the timer expires, the API triggers down alerts and multi-stage escalations. When a device recovers, it fires self-healing recovery notifications.

All core administrative and operational endpoints are secured via token-based **API Key Authentication**.

---

## 1. Setup Instructions

### Prerequisites
* **Node.js**: v18+ is required (Node native `fetch` is utilized).

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/JoshNuku/Pulse-Check-API.git
cd Pulse-Check-API
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root folder to configure local variables:
```env
PORT=3000
NODE_ENV=development
API_KEY=sentinel-secure-key-2026
ESCALATION_MULTIPLIER=2.0
```

### 3. Run the Server
```bash
# Development mode (auto-reloads on save)
npm run dev

# Production mode
npm start
```

### 4. Testing via Postman
A comprehensive production-grade Postman collection (`Pulse-Check-API.postman_collection.json`) is included in the root folder.
* **API Key Header**: Secure requests automatically attach the `x-api-key: {{apiKey}}` header.
* **Repeated Runs**: Postman pre-request scripts dynamically generate unique device IDs (`device-1779667731...`) to ensure repeat runs do not collide.

---

## 2. Architecture & Flow

### Monitor Lifecycle Diagram
```mermaid
sequenceDiagram
    autonumber
    actor Device as Monitored Device
    actor Admin as System Administrator
    participant API as Watchdog Sentinel API
    participant Timer as Timer Engine Daemon
    participant Alerts as Resilient Alert Service

    Note over Device, API: Phase 1: Registration
    Device ->> API: POST /api/monitors (with custom timeout)
    API ->> Timer: Start active countdown timer
    API -->> Device: 201 Created (Monitor Active)

    Note over Device, API: Phase 2: Heartbeat Reset Loop
    Device ->> API: POST /api/monitors/:id/heartbeat
    API ->> Timer: Reset countdown timer back to timeout limit
    API -->> Device: 200 OK (Heartbeat Confirmed)

    Note over Admin, API: Phase 3: Maintenance Pause
    Admin ->> API: POST /api/monitors/:id/pause
    API ->> Timer: Freeze remaining time & Clear active timer
    API -->> Admin: 200 OK (Monitor Paused)

    Note over Device, API: Phase 4: Heartbeat Resume (Auto)
    Device ->> API: POST /api/monitors/:id/heartbeat
    API ->> Timer: Unpause & launch a fresh countdown timer
    API -->> Device: 200 OK (Monitor Recovered & Resumed)

    Note over Device, Alerts: Phase 5: Outage Timeout (Missed Ping)
    Timer ->> Timer: Countdown reaches 0 (Timeout)
    Timer ->> Alerts: Trigger downtime notification
    Alerts ->> Admin: Send Downtime Email / Trigger Webhook
    Timer ->> Timer: Schedule backup escalation timer

    Note over Device, Alerts: Phase 6: Escalation Threshold Reached
    Timer ->> Timer: Escalation timer reaches 0 (2x timeout elapsed)
    Timer ->> Alerts: Trigger backup escalation alert
    Alerts ->> Admin: Send Escalation Email to Backup Contact

    Note over Device, Alerts: Phase 7: Self-Healing Recovery
    Device ->> API: POST /api/monitors/:id/heartbeat (Device back online)
    API ->> Timer: Reset and restore Active tracking state
    API ->> Alerts: Dispatch Recovery Alert notifications
    Alerts ->> Admin: Send 'Device Recovered' Email / Webhook
    API -->> Device: 200 OK (Recovered)
```


### Secured System Components Flowchart
```mermaid
graph TD
    Client -->|HTTP Header x-api-key| Auth[validateApiKey Middleware]
    Auth -->|Verified| API[Express API Router]
    Auth -->|Unauthorized| Err[401 JSON Block]
    API --> Store[(In-Memory Map Cache)]
    Store -->|Mutex-Lock Serialized Queue| Disk[(Atomic Async JSON Persistence)]
    API --> Engine[Timer Engine Daemon]
    Engine --> Alert[Alert Service]
    Alert --> Webhook[Exponential Webhook Retry Queue]
    Alert --> Email[Resilient Async Email Worker Queue]
```

---

## 3. Added Production Features

Beyond the core requirements, this API is hardened with the following premium features:

* **API Key Authentication Middleware**: Every administrative and operational endpoint is guarded by a global authentication filter validating the `x-api-key` header.
* **Self-Healing Alerts**: When a device recovers from a `down` or `escalated` state back to `active`, the system triggers automatic recovery emails, webhook events (`device_recovered`), and console alerts.
* **Non-Blocking Serialized Atomic Persistence**: Replaced standard blocking synchronous file operations. Writes are made to a `.tmp` file and atomically renamed at the OS level to prevent file corruption. Concurrency writes are managed by a sequential Mutex-like queue to avoid collisions.
* **Outbound Email Worker Retry Logic**: Outbound notification dispatches that encounter transient network or SMTP failures are kept in-queue and retried up to 3 times before being safely discarded.
* **Zero-Loss Reboot Recovery**: On server boot, the system parses stored absolute expiration timestamps. It determines remaining timeout windows or immediately flags devices that went offline while the server was rebooting.
* **Webhook Retry Queue**: Outbound HTTP alerts feature a retry queue utilizing exponential backoff (`2s`, `4s`, `8s`, `16s`) with proper `AbortController` cleanup to avoid event loop memory leaks.

---

## 4. API Endpoints

All endpoints are prefixed with `/api` and require authentication.

| Method | Endpoint | Description | Required Headers |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/monitors` | Registers a new countdown monitor switch. | `Content-Type: application/json`<br>`x-api-key: <key>` |
| `POST` | `/api/monitors/:id/heartbeat` | Pings a heartbeat to reset or resume a monitor. | `x-api-key: <key>` |
| `POST` | `/api/monitors/:id/pause` | Snoozes monitoring for maintenance. | `x-api-key: <key>` |
| `GET` | `/api/monitors` | Lists all monitored devices and their states. | `x-api-key: <key>` |
| `GET` | `/api/monitors/:id` | Retrieves a specific monitor and its remaining time to ping. | `x-api-key: <key>` |
| `GET` | `/` | Public base route (Checks service health status). | *None (Public)* |


### Request Payload Examples

#### Register a Monitor (`POST /api/monitors`)
```json
{
  "id": "solar-inverter-4",
  "timeout": 30,
  "alert_email": "ops-alerts@farm.com",
  "webhook_url": "https://alerts-endpoint.example.com/webhook",
  "backup_email": "engineer-on-duty@farm.com"
}
```

* **Joi Validations**:
  - `id`: Must only contain alphanumeric characters, hyphens, and underscores.
  - `timeout`: Must be a positive integer (seconds).
  - `alert_email`: Must be a valid email format.
  - `backup_email`: Must be a valid email format (optional).
  - `webhook_url`: Must be a valid HTTP/HTTPS URL (optional).
