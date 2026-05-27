const https = require('https');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GOOGLE_CALENDAR_REFRESH_TOKEN = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

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

function getGoogleAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = `client_id=${encodeURIComponent(GOOGLE_OAUTH_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_OAUTH_CLIENT_SECRET)}&refresh_token=${encodeURIComponent(GOOGLE_CALENDAR_REFRESH_TOKEN)}&grant_type=refresh_token`;

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('No access token in response'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
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

async function createCalendarEvent(accessToken, taskData, weekData) {
  const now = new Date();
  const [hours, minutes] = (taskData.time || '09:00').split(':');

  const eventStart = new Date(now);
  eventStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  const eventEnd = new Date(eventStart);
  eventEnd.setHours(eventEnd.getHours() + 1);

  const eventPayload = {
    summary: `${taskData.type || '—'}: ${taskData.title || '—'}`,
    description: `שבוע: ${weekData.title || '—'}\n\nתסריט:\n${taskData.script || taskData.script_start || '—'}\n\nCTA: ${taskData.cta || '—'}`,
    start: {
      dateTime: eventStart.toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
    end: {
      dateTime: eventEnd.toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
  };

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(eventPayload);
    const options = {
      hostname: 'www.googleapis.com',
      path: `/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
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

  if (GOOGLE_CALENDAR_REFRESH_TOKEN && GOOGLE_CALENDAR_ID) {
    try {
      const accessToken = await getGoogleAccessToken();
      console.log('✓ Got Google access token');

      await createCalendarEvent(accessToken, taskData, weekData);
      console.log('✓ Calendar event created');
    } catch (error) {
      console.error('⚠ Failed to create calendar event:', error.message);
    }
  } else {
    console.log('⚠ Skipping calendar event (credentials not set)');
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
