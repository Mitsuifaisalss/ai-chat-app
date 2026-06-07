"""Smart routing: decide whether a question needs fresh web info.

Uses simple heuristics (keywords, recency words, question shape) — fast,
deterministic, and good enough. Avoids spending an extra LLM call just to
classify intent.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


# Words that strongly suggest the user wants current/real-world info.
_RECENCY_TERMS = [
    r"\btoday\b", r"\bcurrent(ly)?\b", r"\bnow\b", r"\blatest\b",
    r"\brecent(ly)?\b", r"\bthis (week|month|year)\b", r"\b(yesterday|tomorrow)\b",
    r"\bbreaking\b", r"\bnews\b", r"\bupdate(s|d)?\b",
    r"\b20[2-9][0-9]\b",  # years 2020+
    r"\bprice\b", r"\bstock\b", r"\bweather\b", r"\bscore\b",
    r"\brelease(d)?\b", r"\blaunch(ed)?\b", r"\bannouncement\b",
    r"\bwho won\b", r"\bwhen (is|was|did|will)\b",
    # Japanese recency/query terms
    r"今日", r"現在", r"今", r"最新",
    r"最近", r"今週", r"今月", r"今年", r"昨日", r"明日",
    r"ニュース", r"速報", r"アップデート",
    r"20[2-9][0-9]年",
    r"価格", r"株価", r"天気", r"試合", r"スコア",
    r"発売", r"リリース", r"発表",
]

# Conversational/computational/coding asks that almost never need search.
_NO_SEARCH_HINTS = [
    r"\bwrite (a|some|the)?\s*(code|function|script|program)\b",
    r"\bexplain\b", r"\bsummari(z|s)e\b",
    r"\btranslate\b", r"\brewrite\b", r"\bfix\b", r"\bdebug\b",
    r"\b(hello|hi|hey|thanks|thank you|good (morning|night))\b",
    r"\bdefin(e|ition)\b", r"\bwhat (is|are) the difference\b",
    r"\bgive me an example\b", r"\bhow (do|can) i\b",
    # Japanese no-search hints
    r"コードを", r"プログラミング", r"関数",
    r"説明して", r"要約して",
    r"翻訳", r"書き直して", r"修正して", r"デバッグ",
    r"こんにちは", r"ありがとう", r"おはよう", r"おやすみ",
    r"定義", r"違い",
    r"例を", r"どうやって",
]

_RECENCY_RE = re.compile("|".join(_RECENCY_TERMS), re.IGNORECASE)
_NO_SEARCH_RE = re.compile("|".join(_NO_SEARCH_HINTS), re.IGNORECASE)


@dataclass
class RouteDecision:
    needs_search: bool
    search_query: str
    reason: str


def decide_route(user_message: str) -> RouteDecision:
    """Return a routing decision for the given user message."""
    msg = (user_message or "").strip()

    if not msg:
        return RouteDecision(False, "", "empty message")

    # Strong negative signals first.
    if _NO_SEARCH_RE.search(msg) and not _RECENCY_RE.search(msg):
        return RouteDecision(False, "", "looks like a knowledge / coding ask")

    # Default to searching for everything else to provide maximum context
    return RouteDecision(True, _build_query(msg), "default to comprehensive search")


def _build_query(msg: str) -> str:
    """Trim a user message into a tighter search query."""
    q = msg.strip().rstrip("?.!")
    # Strip leading filler.
    q = re.sub(
        r"^(please|can you|could you|would you|hey|hi|tell me|i want to know|i'd like to know)\s+,?\s*",
        "",
        q,
        flags=re.IGNORECASE,
    )
    # Cap length.
    return q[:200]
