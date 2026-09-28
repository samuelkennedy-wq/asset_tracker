import { loadDb, saveDb, logSystem } from './database';

/**
 * Enqueues an email into the database queue.
 */
export function queueEmail(recipient: string, subject: string, body: string): void {
  const db = loadDb();
  const id = db.email_queue.length ? Math.max(...db.email_queue.map(e => e.id)) + 1 : 1;

  db.email_queue.push({
    id,
    recipient,
    subject,
    body,
    status: 'PENDING',
    created_at: new Date().toISOString()
  });

  logSystem('INFO', `Email notification queued for ${recipient}: "${subject}"`);
  saveDb();

  // Trigger immediate flush check if online
  flushEmailQueue();
}

/**
 * Attempts to process and send any pending emails in the queue if internet is online.
 * Returns the number of successfully flushed emails.
 */
export function flushEmailQueue(): number {
  const db = loadDb();
  
  if (!db.is_internet_online) {
    // Silent skip - sync worker handles the periodic warning logs to avoid spam
    return 0;
  }

  const pending = db.email_queue.filter(e => e.status === 'PENDING');
  if (pending.length === 0) return 0;

  let sentCount = 0;
  for (const email of pending) {
    try {
      // Simulate real SMTP delay and delivery
      email.status = 'SENT';
      email.sent_at = new Date().toISOString();
      sentCount++;
      
      logSystem('SUCCESS', `SMTP Outbox: Email ID #${email.id} successfully delivered to ${email.recipient}`);
    } catch (err) {
      email.status = 'FAILED';
      logSystem('ERROR', `SMTP Outbox Error: Failed to transmit Email ID #${email.id}`);
    }
  }

  if (sentCount > 0) {
    saveDb();
  }

  return sentCount;
}

/**
 * Starts a background interval worker that periodically checks the email queue.
 * Simulates a reliable offline retry service.
 */
let workerIntervalId: NodeJS.Timeout | null = null;

export function startEmailSyncWorker(): void {
  if (workerIntervalId) return;

  logSystem('INFO', 'Background email synchronization worker started (5s intervals).');

  workerIntervalId = setInterval(() => {
    const db = loadDb();
    const pending = db.email_queue.filter(e => e.status === 'PENDING');

    if (pending.length > 0) {
      if (db.is_internet_online) {
        logSystem('INFO', `Sync Worker: Connection established. Flushing ${pending.length} pending notifications...`);
        const sent = flushEmailQueue();
        if (sent > 0) {
          logSystem('SUCCESS', `Sync Worker: Flushed ${sent} emails successfully.`);
        }
      } else {
        logSystem('WARN', `Sync Worker: Retry paused. Internet offline. ${pending.length} email(s) waiting in local SQL queue.`);
      }
    }
  }, 5000);
}
