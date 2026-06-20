import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def describe_domain(domain: str) -> str:
    """One-sentence description of what a domain is. Cached by caller."""
    try:
        msg = get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": (
                    f"In one sentence, what is the website '{domain}'? "
                    "Be concise and factual. If it's unknown, say so."
                ),
            }],
        )
        return msg.content[0].text.strip()
    except Exception:
        return ""


def generate_summary(stats: dict) -> str:
    """Natural language summary of traffic stats for a given time range."""
    try:
        prompt = f"""You are analyzing home network traffic logs for a personal apartment.

Time range: {stats['from_date']} to {stats['to_date']}
Total visits: {stats['total_visits']}
Unique domains: {stats['unique_domains']}
Devices seen: {stats['device_count']}

Top domains by visits:
{chr(10).join(f"  {i+1}. {d['domain']} — {d['visits']} visits" for i, d in enumerate(stats['top_domains'][:15]))}

Visits by device:
{chr(10).join(f"  {d['name']} ({d['ip']}) — {d['visits']} visits" for d in stats['devices'])}

Busiest hours (UTC):
{chr(10).join(f"  {h['hour']}:00 — {h['visits']} visits" for h in stats['hourly'][:5])}

Write a 2-3 paragraph natural language summary of browsing patterns, notable activity, and any interesting observations. Be conversational, not clinical."""

        msg = get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        return f"Summary generation failed: {e}"
