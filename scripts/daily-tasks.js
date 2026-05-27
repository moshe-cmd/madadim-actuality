const https = require('https');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function post(hostname, pathname, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getScheduleInfo() {
  const now = new Date();
  const date = now.getDate();
  const dayOfWeek = now.getDay();

  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = daysMap[dayOfWeek];

  let weekNumber = 1;
  if (date >= 22) weekNumber = 4;
  else if (date >= 15) weekNumber = 3;
  else if (date >= 8) weekNumber = 2;

  return { dayName, weekNumber };
}

function loadSchedule() {
  const scheduleFile = path.join(__dirname, '../content-schedule.json');
  const data = fs.readFileSync(scheduleFile, 'utf8');
  return JSON.parse(data);
}

async function sendTelegramMessage(text) {
  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
  });

  const result = await post('api.telegram.org', `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, payload);
  console.log('✓ Telegram message sent');
  return result;
}

async function main() {
  console.log('📋 Starting daily task reminder...');

  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }
  if (!TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_CHAT_ID not set');
  }

  const { dayName, weekNumber } = getScheduleInfo();
  console.log(`📅 Today: ${dayName}, week ${weekNumber}`);

  const schedule = loadSchedule();
  const weekKey = `week${weekNumber}`;
  const weekData = schedule.schedule[weekKey];

  if (!weekData) {
    throw new Error(`No schedule for ${weekKey}`);
  }

  const taskData = weekData[dayName];
  if (!taskData) {
    throw new Error(`No task for ${dayName} in ${weekKey}`);
  }

  const weekTitle = weekData.title || 'לא מוגדר';
  const taskType = taskData.type || '—';
  const taskTitle = taskData.title || '—';
  const taskTime = taskData.time || '—';
  const filming = taskData.filming || '—';
  const script = taskData.script || taskData.script_start || '—';
  const cta = taskData.cta || '—';
  const series = taskData.series ? `\n<b>סדרה:</b> ${taskData.series}` : '';

  const message = `
<b>📺 משימת היום</b>

<b>שבוע:</b> ${weekTitle}

<b>סוג:</b> ${taskType}
<b>כותרת:</b> ${taskTitle}${series}
<b>שעה:</b> ${taskTime}

<b>📸 מה לצלם:</b>
${filming}

<b>📝 תסריט:</b>
${script}

<b>📢 CTA:</b>
${cta}
`.trim();

  console.log('\n' + message + '\n');

  await sendTelegramMessage(message);

  console.log('✓ Daily task sent to Telegram');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
