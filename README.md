# 📰 סטורי אקטואליה — מדדים משכנתאות

מערכת אוטומטית שמייצרת 4-5 נושאים אקטואליים בעולם המשכנתא והפיננסים בישראל, כל יום שלישי בשעה 07:00 בוקר.

## מה זה עושה?

- 🤖 **Claude AI** מוציא נושאים רלוונטיים למשכנתא בישראל
- 💬 **Telegram** מקבל הודעה עם הנושאים ישר בטלפון
- 📅 **Google Calendar** משדכן את קלנדר "שיווק" עם כל הנושאים
- ⏰ **אוטומטי** — רץ בעצמו כל שלישי, 24/7

## התחלה מהירה

1. קרא את [SETUP.md](SETUP.md) לניקוד מלא של הגדרת GitHub Secrets
2. צור repo חדש ב-GitHub
3. Push את הקבצים ל-GitHub
4. הוסף את ה-Secrets בהגדרות
5. מחכים ליום שלישי בשעה 07:00 — תקבל הודעה בטלגרם!

## מבנה הקבצים

```
.github/
  workflows/
    actuality-stories.yml    # GitHub Actions schedule & config
scripts/
  actuality-stories.js       # Main automation script
package.json                 # Node.js dependencies
SETUP.md                      # Setup guide (Hebrew)
README.md                     # This file
.gitignore                    # Git ignore rules
```

## קבצים שצריך להגדיר

- `CLAUDE_API_KEY` — API key מ-Anthropic
- `TELEGRAM_BOT_TOKEN` — Token של בוט הטלגרם
- `TELEGRAM_CHAT_ID` — 405817126
- `GOOGLE_CALENDAR_ID` — ID של קלנדר "שיווק"
- `GOOGLE_CALENDAR_CREDENTIALS` — JSON service account

👉 [פרטים מלאים ב-SETUP.md](SETUP.md)

## בדיקה בעצמך

```bash
export CLAUDE_API_KEY="sk-..."
npm install
node scripts/actuality-stories.js
```

---

**משה אלבז** | מדדים משכנתאות ופיננסים
