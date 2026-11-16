"""Small, dependency-free NLP helpers: text cleaning, statistics and keyword extraction.

These run locally (no API needed), so they also work as a fallback if Gemini is busy.
"""
import re
from collections import Counter

STOPWORDS = set("""
a about above after again against all also am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have having
he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on
once only or other our ours out over own same she should so some such than that the their theirs them then
there these they this those through to too under until up very was we were what when where which while who
whom why will with would you your yours may might must shall also however thus therefore etc eg ie via per
using used use one two three often many much even like within without across among made make makes
""".split())

WORD_RE = re.compile(r"[A-Za-z][A-Za-z\-']{2,}")


def clean_text(text):
    """Collapse extra whitespace and remove odd characters (useful after PDF extraction)."""
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def text_stats(text):
    words = re.findall(r"\b\w+\b", text)
    sentences = [s for s in re.split(r"[.!?]+\s", text) if s.strip()]
    return {
        "words": len(words),
        "sentences": len(sentences),
        "reading_minutes": max(1, round(len(words) / 200)),
    }


def extract_keywords(text, top_n=12):
    """Frequency-based keyword + key-phrase extraction (stop-word filtered)."""
    unigrams, bigrams = Counter(), Counter()

    for sentence in re.split(r"[.!?\n;:]+", text.lower()):
        tokens = WORD_RE.findall(sentence)
        previous = None
        for token in tokens:
            if token in STOPWORDS:
                previous = None
                continue
            unigrams[token] += 1
            if previous:
                bigrams[f"{previous} {token}"] += 1
            previous = token

    scored = {}
    for phrase, count in bigrams.items():
        if count >= 2:
            scored[phrase] = count * 2.5
    for word, count in unigrams.items():
        scored[word] = scored.get(word, 0) + count

    chosen = []
    for phrase, _ in sorted(scored.items(), key=lambda kv: kv[1], reverse=True):
        # skip single words already covered by a chosen phrase
        if " " not in phrase and any(phrase in c.split() for c in chosen):
            continue
        chosen.append(phrase)
        if len(chosen) >= top_n:
            break
    return chosen
