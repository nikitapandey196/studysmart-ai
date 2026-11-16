"""Checks your email settings step by step. Run:  python test_email.py
It never prints your password and does not send any email."""
import os
import smtplib
import ssl

from dotenv import load_dotenv

load_dotenv()

host = os.getenv("SMTP_HOST", "")
port_text = os.getenv("SMTP_PORT", "587")
user = os.getenv("SMTP_USER", "")
password = os.getenv("SMTP_PASSWORD", "")

print("--- Settings found in .env ---")
print("SMTP_HOST     :", repr(host))
print("SMTP_PORT     :", repr(port_text))
print("SMTP_USER     :", repr(user))
print("SMTP_PASSWORD :", f"{len(password)} characters", "(Gmail App Passwords have 16, with no spaces)")
print("Spaces in password:", " " in password)
print()

if not (host and user and password):
    raise SystemExit("One of SMTP_HOST, SMTP_USER or SMTP_PASSWORD is missing in .env")


def attempt(port):
    print(f"=== Trying port {port} ===")
    context = ssl.create_default_context()
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, context=context, timeout=20)
        else:
            server = smtplib.SMTP(host, port, timeout=20)
        print("1. Connected to server: OK")
    except Exception as e:
        print("1. Connected to server: FAILED ->", repr(e))
        return False

    try:
        with server:
            server.ehlo()
            print("2. Greeting (EHLO): OK")
            if port != 465:
                server.starttls(context=context)
                server.ehlo()
                print("3. Secure connection (STARTTLS): OK")
            server.login(user, password)
            print("4. Login with App Password: OK")
        print(f"RESULT: port {port} WORKS. Use SMTP_PORT={port}\n")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print("Login FAILED -> the connection works, but Gmail rejected the username or App Password.")
        print("   Details:", e.smtp_code, "(check SMTP_USER and the 16-character App Password)\n")
        return True  # network is fine; the password needs fixing
    except Exception as e:
        print("Stopped here ->", repr(e), "\n")
        return False


if not attempt(587):
    attempt(465)
