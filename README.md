# StudySmart AI

AI-powered study assistant. Paste notes or upload a PDF, then simplify, summarize, find key concepts,
extract keywords or generate practice questions. Users register (with an email), log in, can reset a forgotten password by email, and each user's results are saved separately in a local SQLite database.

**Tech:** Python, Flask, HTML5, CSS3, JavaScript, Google Gemini API, NLP (local keyword extraction), SQLite, PyPDF, Git & GitHub.

## Project structure

```
studysmart-ai/
├── app.py            # Flask routes + Gemini prompts + PDF upload
├── database.py       # SQLite users + per-user history (studysmart.db is created automatically)
├── nlp_utils.py      # Text cleaning, word stats, keyword extraction
├── requirements.txt  # Python packages
├── .env              # YOUR secret key (never upload to GitHub)
├── .env.example      # Template for .env
├── .gitignore
├── templates/
│   ├── index.html    # main app page (login required)
│   └── auth.html     # login and register page
└── static/
    ├── css/style.css
    └── js/script.js
```

## Run on your laptop (Windows)

1. Install Python 3.10 or newer from python.org (tick "Add Python to PATH").
2. Open the project folder in VS Code, then open a terminal (Ctrl + `).
3. Create and activate a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate
   ```
   (Mac/Linux: `python3 -m venv venv` then `source venv/bin/activate`)
4. Install the requirements:
   ```
   pip install -r requirements.txt
   ```
5. Create a file named `.env` (copy `.env.example`) and put your key in it:
   ```
   GEMINI_API_KEY=your_real_key
   ```
   Get a free key at https://aistudio.google.com/apikey
   (A `SECRET_KEY` line for login sessions is added to `.env` automatically the first time you run the app.)
6. Start the app:
   ```
   python app.py
   ```
7. Open http://127.0.0.1:5000 in your browser. Click "Create an account" the first time, then log in.

## Email setup (for "Forgot password")

The app sends the reset link with SMTP using the settings in `.env`. Gmail is the easiest:

1. Use a Gmail account and turn on **2-Step Verification** (Google Account > Security).
2. Create an **App Password**: https://myaccount.google.com/apppasswords (name it "StudySmart").
   Google shows a 16-character password. Copy it.
3. Add these lines to `.env` (see `.env.example`):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourname@gmail.com
   SMTP_PASSWORD=the_16_character_app_password
   ```
4. Restart the app. On the login page click **Forgot password?**, enter a registered email and open the link in the email.

If the SMTP lines are missing, the reset link is **printed in the VS Code terminal** instead of being emailed.
That is useful for testing. Never share or upload the App Password.

Accounts created before email existed: log in, click **Account email** and add one.

## Git & GitHub

```
git init
git add .
git commit -m "StudySmart AI - first version"
git branch -M main
git remote add origin https://github.com/<your-username>/studysmart-ai.git
git push -u origin main
```
`.gitignore` already keeps `.env`, `venv/` and the database out of GitHub.
If your API key was ever uploaded or shared, create a new one in Google AI Studio.

## Troubleshooting

| Problem | Fix |
|---|---|
| `GEMINI_API_KEY is missing` | The file must be named exactly `.env` (not `_env` or `env.txt`) and sit next to `app.py`. |
| `No module named ...` | Activate the venv, then run `pip install -r requirements.txt` again. |
| "AI is temporarily busy" | Check internet and the key, read the terminal for the real error. A 404 about the model means set `GEMINI_MODEL` in `.env` to a model your key supports. |
| PDF gives "No readable text" | The PDF is a scan (images). Use a text-based PDF. |
| Reset email not arriving | Check spam, check the SMTP lines in `.env`, use the App Password (not your normal Gmail password) and try a mobile hotspot if college Wi-Fi blocks port 587. The terminal shows the exact error. |
| Port 5000 in use | Change `port=5000` at the bottom of `app.py`. |
