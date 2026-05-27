const https = require('https');
const { promisify } = require('util');

const post = promisify((options, data, callback) => {
  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode >= 400) {
        callback(new Error(`HTTP ${res.statusCode}: ${body}`));
      } else {
        try {
          callback(null, JSON.parse(body));
        } catch {
          callback(null, body);
        }
      }
    });
  });
  req.on('error', callback);
  req.write(JSON.stringify(data));
  req.end();
});

async function searchWithClaude() {
  const claudePayload = {
    model: 'claude-opus-4-7',
    max_tokens: 1000,
    system: `אתה סוכן מחקר לייעוץ משכנתאות בישראל.
תפקידך: להציע 4-5 נושאים עדכניים בתחום המשכנתאות, הפיננסים והנכסים בישראל שכדאי לדבר עליהם בפוסט סטורי.

הנושאים צריכים להיות:
- רלוונטיים למשפחות בניידות 30-55 שיש להם נכסים
- קשורים ישירות או בעקיפין לליווי משכנתא, מחזור, איחוד, מימון נכס
- עדכניים וחוקיים (שיעור בנק ישראל, שינויים בנתונים כלכליים, טרנדים בשוק הדירות)
- בעלי ערך מעשי או חדשות שמשפיעות על החלטות פיננסיות

עבור כל נושא כתוב בפורמט:
## נושא: [כותרת בעברית]
**מדוע זה חשוב:** [משפט אחד למה זה רלוונטי ללקוח שלנו]
**טיפ קצר:** [משפט שני עם תובנה או פעולה מוצעת]

בדוק את הידע שלך על מה קורה בשוק בימים אלה. כתוב 4-5 נושאים.`,
    messages: [
      {
        role: 'user',
        content: 'בואו ניצור 4-5 נושאים אקטואליה למשכנתא וליווי פיננסי בישראל להיום.'
      }
    ]
  };

  const response = await post(
    {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    },
    claudePayload
  );

  if (response.content && response.content[0] && response.content[0].text) {
    return response.content[0].text;
  }
  throw new Error('Invalid Claude response');
}

async function sendTelegram(message) {
  const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  };

  const url = new URL(telegramUrl);
  const response = await post(
    {
      hostname: 'api.telegram.org',
      path: `/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    payload
  );

  if (!response.ok) {
    throw new Error(`Telegram error: ${response.description}`);
  }
  console.log('✓ Telegram notification sent');
}

async function createCalendarEvent(topicsText) {
  const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);

  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const eventPayload = {
    summary: '📰 סטורי אקטואליה — משכנתא וליווי פיננסי',
    description: topicsText,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Asia/Jerusalem'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Jerusalem'
    }
  };

  // Here we would call Google Calendar API
  // For now, log the event details
  console.log('📅 Calendar event prepared:', eventPayload.summary);
  console.log('Description:', topicsText.substring(0, 100) + '...');
}

async function main() {
  try {
    console.log('🚀 Starting actuality stories generation...\n');

    // Generate topics with Claude
    console.log('📝 Generating topics with Claude...');
    const topicsText = await searchWithClaude();
    console.log('✓ Topics generated\n');
    console.log(topicsText);
    console.log('\n');

    // Format for Telegram
    const telegramMessage = `<b>📰 סטורי אקטואליה — משכנתא וליווי פיננסי</b>\n\n${topicsText}`;

    // Send to Telegram
    await sendTelegram(telegramMessage);

    // Create Calendar event
    await createCalendarEvent(topicsText);

    console.log('\n✅ Actuality stories completed successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
