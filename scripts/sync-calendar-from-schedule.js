const fs = require('fs');
const path = require('path');
const https = require('https');

const GOOGLE_CALENDAR_REFRESH_TOKEN = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

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

function createCalendarEvent(accessToken, eventData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(eventData);
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

async function syncCalendarFromSchedule() {
  console.log('📅 Syncing calendar from content schedule...\n');

  const accessToken = await getGoogleAccessToken();
  console.log('✓ Got Google access token\n');

  const scheduleFile = path.join(__dirname, '../content-schedule.json');
  const schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));

  let eventCount = 0;

  for (const [dateStr, taskData] of Object.entries(schedule.schedule)) {
    // Parse the task time
    const [hours, minutes] = (taskData.time || '09:00').split(':');
    const [year, month, day] = dateStr.split('-');

    // Create event start and end times
    const eventStart = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), 0);
    const eventEnd = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hours) + 1, parseInt(minutes), 0);

    const event = {
      summary: `${taskData.type ? '📺 ' : ''}${taskData.title}`,
      description: `סוג: ${taskData.type}\n\nתסריט:\n${taskData.script || taskData.script_start || '—'}\n\nCTA: ${taskData.cta || '—'}${taskData.series ? `\n\nסדרה: ${taskData.series}` : ''}`,
      start: { dateTime: eventStart.toISOString(), timeZone: 'Asia/Jerusalem' },
      end: { dateTime: eventEnd.toISOString(), timeZone: 'Asia/Jerusalem' },
    };

    await createCalendarEvent(accessToken, event);
    eventCount++;
    console.log(`✓ Event created for ${dateStr}: ${taskData.title}`);
  }

  console.log(`\n✅ ${eventCount} calendar events synced successfully`);
}

syncCalendarFromSchedule().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
