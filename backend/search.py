"""Web search + lightweight scraping module.

Uses DuckDuckGo (no API key) to find candidate URLs, then fetches the top
results with httpx and extracts readable text via BeautifulSoup. Designed
to be best-effort and fail-soft so the chat flow never breaks if a single
fetch fails.
"""

from __future__ import annotations

import asyncio
import os
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Any

import urllib.parse
import xml.etree.ElementTree as ET

import httpx
from bs4 import BeautifulSoup


SCRAPE_MAX_CHARS = int(os.getenv("SCRAPE_MAX_CHARS", "2500"))
SCRAPE_TIMEOUT = int(os.getenv("SCRAPE_TIMEOUT", "8"))
SEARCH_MAX_RESULTS = int(os.getenv("SEARCH_MAX_RESULTS", "5"))

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    content: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


async def _google_news_search(query: str, max_results: int, client: httpx.AsyncClient) -> List[Dict[str, str]]:
    """Async Google News RSS fetch."""
    q = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
    results: List[Dict[str, str]] = []
    try:
        resp = await client.get(url, timeout=SCRAPE_TIMEOUT)
        root = ET.fromstring(resp.text)
        for i, item in enumerate(root.findall(".//item")):
            if i >= max_results:
                break
            results.append({
                "title": item.findtext("title", ""),
                "url": item.findtext("link", ""),
                "snippet": item.findtext("description", ""),
            })
    except Exception:
        pass
    return results


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    # Drop noisy tags
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside", "form"]):
        tag.decompose()

    # Prefer <article> or <main> if present
    main = soup.find("article") or soup.find("main") or soup.body or soup
    text = main.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text)
    return text[:SCRAPE_MAX_CHARS]


async def _fetch_one(client: httpx.AsyncClient, item: Dict[str, str]) -> SearchResult:
    url = item.get("url", "")
    result = SearchResult(
        title=item.get("title", ""),
        url=url,
        snippet=item.get("snippet", ""),
    )
    if not url:
        return result
    try:
        resp = await client.get(
            url,
            timeout=SCRAPE_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )
        ctype = resp.headers.get("content-type", "")
        if resp.status_code == 200 and "html" in ctype.lower():
            result.content = _extract_text(resp.text)
    except Exception:
        # fail-soft: keep the snippet so the LLM still has *something*
        pass
    if not result.content:
        result.content = result.snippet
    return result


async def search_and_scrape(
    query: str, max_results: int | None = None
) -> List[SearchResult]:
    """Search Google News, then fetch + extract text from each top result."""
    n = max_results or SEARCH_MAX_RESULTS

    async with httpx.AsyncClient() as client:
        raw = await _google_news_search(query, n, client)
        if not raw:
            return []
        tasks = [_fetch_one(client, item) for item in raw]
        return await asyncio.gather(*tasks)


def build_context_block(results: List[SearchResult]) -> str:
    """Format scraped results into a compact context block for the LLM."""
    if not results:
        return ""
    lines = ["You have access to the following web search results. "
             "Use them to answer the user's question and cite sources by number when relevant.\n"]
    for i, r in enumerate(results, 1):
        lines.append(f"[{i}] {r.title}\nURL: {r.url}\n{r.content}\n")
    return "\n".join(lines)
