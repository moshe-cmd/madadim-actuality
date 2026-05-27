# סטורי אקטואליה - Actuality Stories Automation

מערכת אוטומטית שמחפשת 4-5 נושאים אקטואליים בעולם המשכנתא והפיננסים בישראל כל יום שלישי בשעה 07:00, ושולחת אותם למשה דרך Telegram וגוגל קלנדר.

## קבצים במערכת

- `.github/workflows/actuality-stories.yml` - GitHub Actions workflow שרץ כל שלישי בשעה 04:00 UTC (07:00 Israel time)
- `scripts/actuality-stories.js` - הקוד הראשי שמייצר את הנושאים ושולח אותם
- `package.json` - תלויות Node.js

## שלבי הגדרה

### 1. פתח את GitHub Secrets

כדי שהקוד יוכל לגשת ל-API שונים, צריך להגדיר "Secrets" ב-GitHub:

1. לך ל-[GitHub Desktop](https://desktop.github.com/) או `https://github.com/[username]/[repository]/settings/secrets/actions`
2. לחץ על "New repository secret" וערוך כל אחד מהם:

### 2. הוסף את ה-Secrets הנדרשים

#### `CLAUDE_API_KEY`
- לך ל-[Anthropic Console](https://console.anthropic.com/)
- בחר "API Keys" בתפריט שמאל
- לחץ "Create Key"
- העתק את ה-key וכנס אותו כ-`CLAUDE_API_KEY`

#### `TELEGRAM_BOT_TOKEN`
- בוט הוא כבר קיים: `@madadim_bot`
- Token בטוח בהתאם למידע ש-משה יש
- כנס אותו כ-`TELEGRAM_BOT_TOKEN`

#### `TELEGRAM_CHAT_ID`
- ערך קבוע: `405817126`
- כנס כ-`TELEGRAM_CHAT_ID`

#### `GOOGLE_CALENDAR_ID`
- לך ל-[Google Calendar Settings](https://calendar.google.com/calendar/u/0/r/settings)
- בחר את הקלנדר "שיווק"
- חיפוש אחרי "Calendar ID"
- העתק את ה-ID (יהיה בפורמט: `c_740c...@group.calendar.google.com`)
- כנס כ-`GOOGLE_CALENDAR_ID`

#### `GOOGLE_CALENDAR_CREDENTIALS`
- לך ל-[Google Cloud Console](https://console.cloud.google.com/)
- בחר את הפרויקט שלך (או יצור אחד חדש)
- Enable the Google Calendar API
- צור Service Account:
  1. לחץ "Create Credentials" → "Service Account"
  2. מלא את הפרטים
  3. לחץ "Create and Continue"
  4. בחר את ה-service account שנוצר
  5. לחץ על "Keys" tab
  6. לחץ "Add Key" → "Create new key" → בחר JSON
  7. JSON file יורד — העתק את כל התוכן
- כנס את ה-JSON כ-`GOOGLE_CALENDAR_CREDENTIALS`

**חשוב:** עדיף להעביר את ה-credentials בצורה בטוחה. אם אתה לא רוצה לשתף סודות, אפשר גם להריץ בעצמך בלוקאלי.

### 3. Push to GitHub

```bash
git add .
git commit -m "Add actuality stories automation"
git branch -M main
git remote add origin https://github.com/[your-username]/[your-repo].git
git push -u origin main
```

## איך זה עובד?

1. **כל יום שלישי בשעה 07:00 בוקר**:
   - GitHub Actions מעיר את ה-workflow
   - קורא ל-Claude API עם prompt בעברית
   - Claude מוציא 4-5 נושאים רלוונטיים למשכנתא בישראל

2. **Claude מחזיר**:
   ```
   ## נושא: [כותרת]
   **מדוע זה חשוב:** [הסבר]
   **טיפ קצר:** [תובנה]
   ```

3. **הנושאים נשלחים ל-Telegram** (@madadim_bot):
   - פורמט HTML עם bold ו-formatting
   - קל לקרוא על הטלפון

4. **יוצרים event בגוגל קלנדר** (קלנדר "שיווק"):
   - Title: "📰 סטורי אקטואליה — משכנתא וליווי פיננסי"
   - Description: הנושאים המלאים
   - שעה: 07:00 (Israel timezone)

## תיקונים ושיפורים

אם אתה רוצה לשנות משהו:

### תדירות שונה
בקובץ `.github/workflows/actuality-stories.yml`, שנה את ה-cron:
- `0 4 * * 2` = כל שלישי בשעה 04:00 UTC (07:00 Israel)
- `0 4 * * 1,3,5` = ראשון, שלישי, חמישי

### שעה שונה
- 03:00 UTC = 06:00 Israel time (in winter)
- 04:00 UTC = 07:00 Israel time (summer)
- 05:00 UTC = 08:00 Israel time (summer)

### שינוי ה-prompt ל-Claude
בקובץ `scripts/actuality-stories.js`, חפש את ה-`system` prompt וערוך אותו.

## בדיקה בעצמך (בלי לחכות ליום שלישי)

```bash
export CLAUDE_API_KEY="sk-..."
export TELEGRAM_BOT_TOKEN="..."
export TELEGRAM_CHAT_ID="405817126"
export GOOGLE_CALENDAR_ID="..."
export GOOGLE_CALENDAR_CREDENTIALS='{"type":"service_account",...}'

npm install
node scripts/actuality-stories.js
```

## טרובלשוט

### Telegram לא מקבל הודעות
- בדוק שה-token נכון
- בדוק ש-chat_id נכון (405817126)

### Claude לא עונה
- בדוק ש-API key תקף
- בדוק שאתה לא חרג מ-rate limits

### Google Calendar לא מתעדכן
- בדוק ש-Calendar ID נכון
- בדוק ש-Service Account יש הרשאות

## הערות

- GitHub Actions מריץ בשרתי GitHub, לא בעמוד שלך
- מערכת זו עובדת 24/7, גם אם מחשב שלך כבוי
- אפשר לבדוק את ה-logs ב-GitHub בכל עת
