import smtplib, ssl, os
from dotenv import load_dotenv
load_dotenv()
s = smtplib.SMTP("smtp.gmail.com", 587, timeout=20)
s.set_debuglevel(1)
s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo()
s.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))