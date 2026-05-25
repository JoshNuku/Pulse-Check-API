import nodemailer from 'nodemailer';

const emailQueue = [];
let transporter = null;
let isProcessing = false;

// Initialize the Ethereal SMTP Test Account
export async function startEmailWorker() {
  console.log('[Email Worker] Initializing Ethereal Test Account...');
  try {
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(`[Email Worker] Ready. Ethereal Email Account: ${testAccount.user}`);
    
    // Start the background worker loop (runs every 3 seconds)
    setInterval(processQueue, 3000);
  } catch (err) {
    console.error('[Email Worker] Failed to initialize Ethereal account:', err.message);
  }
}

// Push an email to the asynchronous queue
export function queueEmail(to, subject, text, attempts = 1) {
  if (!to) return;
  emailQueue.push({ to, subject, text, attempts });
  console.log(`[Email Worker] Queued email to ${to} (Attempt ${attempts}, Queue size: ${emailQueue.length})`);
}

// The background worker function that drains the queue
async function processQueue() {
  if (isProcessing || emailQueue.length === 0 || !transporter) {
    return; // Already processing, queue is empty, or not initialized
  }

  isProcessing = true;
  const task = emailQueue.shift();

  try {
    console.log(`[Email Worker] Processing email to ${task.to} (Attempt ${task.attempts || 1}/3)...`);
    const info = await transporter.sendMail({
      from: '"Sentinel API" <sentinel@watchdog.local>',
      to: task.to,
      subject: task.subject,
      text: task.text,
    });

    console.log(`[Email Worker] Success! Email sent to ${task.to}`);
    // This is the magic! It logs the URL where you can view the fake email
    console.log(`[Email Worker] 📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (err) {
    console.error(`[Email Worker] Failed to send email to ${task.to} (Attempt ${task.attempts || 1}/3):`, err.message);
    const currentAttempts = task.attempts || 1;
    if (currentAttempts < 3) {
      // Re-queue with incremented attempt count
      queueEmail(task.to, task.subject, task.text, currentAttempts + 1);
      console.log(`[Email Worker] Scheduled retry for email to ${task.to}`);
    } else {
      console.error(`[Email Worker] Max email retries (3) reached. Discarding email to ${task.to}.`);
    }
  } finally {
    isProcessing = false;
    
    // If there are more items, process them immediately rather than waiting 3 seconds
    if (emailQueue.length > 0) {
      setTimeout(processQueue, 0);
    }
  }
}
