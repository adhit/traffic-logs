from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone
import aiosqlite
from api.database import get_db
from api import ai

router = APIRouter(prefix="/api/domains", tags=["domains"])


def _date_range(preset: Optional[str], from_date: Optional[str], to_date: Optional[str]):
    now = datetime.now(timezone.utc).isoformat()
    presets = {
        "1d": "datetime('now', '-1 day')",
        "7d": "datetime('now', '-7 days')",
        "30d": "datetime('now', '-30 days')",
    }
    if preset and preset in presets:
        return presets[preset], f"'{now}'"
    from_sql = f"'{from_date}'" if from_date else "datetime('now', '-7 days')"
    to_sql = f"'{to_date}'" if to_date else f"'{now}'"
    return from_sql, to_sql


@router.get("")
async def list_domains(
    preset: Optional[str] = Query(None, description="1d | 7d | 30d"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    device_ip: Optional[str] = Query(None),
    db: aiosqlite.Connection = Depends(get_db),
):
    from_sql, to_sql = _date_range(preset, from_date, to_date)

    device_filter = "AND l.device_ip = :device_ip" if device_ip else ""
    params: dict = {"device_ip": device_ip} if device_ip else {}

    async with db.execute(
        f"""SELECT l.domain,
                   COUNT(*) AS visits,
                   COUNT(DISTINCT l.device_ip) AS device_count,
                   MAX(l.timestamp) AS last_seen,
                   di.ai_description
            FROM dns_logs l
            LEFT JOIN domain_info di ON di.domain = l.domain
            WHERE l.timestamp BETWEEN {from_sql} AND {to_sql}
            {device_filter}
            GROUP BY l.domain
            ORDER BY visits DESC""",
        params,
    ) as cur:
        rows = [dict(r) for r in await cur.fetchall()]

    # Kick off AI description for any domain that doesn't have one yet (fire-and-forget via background)
    missing = [r["domain"] for r in rows if not r["ai_description"]]
    if missing:
        import asyncio
        asyncio.create_task(_fill_descriptions(missing[:20], db))

    return rows


async def _fill_descriptions(domains: list[str], db: aiosqlite.Connection):
    import asyncio
    for domain in domains:
        desc = await asyncio.get_event_loop().run_in_executor(None, ai.describe_domain, domain)
        if desc:
            await db.execute(
                """INSERT INTO domain_info (domain, ai_description, updated_at)
                   VALUES (?, ?, datetime('now'))
                   ON CONFLICT(domain) DO UPDATE SET
                       ai_description=excluded.ai_description,
                       updated_at=excluded.updated_at""",
                (domain, desc),
            )
    await db.commit()


@router.get("/{domain}")
async def domain_detail(
    domain: str,
    preset: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: aiosqlite.Connection = Depends(get_db),
):
    from_sql, to_sql = _date_range(preset, from_date, to_date)

    by_device_cur = await db.execute(
        f"""SELECT l.device_ip,
                   COALESCE(d.friendly_name, d.hostname, l.device_ip) AS device_name,
                   COUNT(*) AS visits,
                   MAX(l.timestamp) AS last_seen
            FROM dns_logs l
            LEFT JOIN devices d ON d.ip = l.device_ip
            WHERE l.domain = ? AND l.timestamp BETWEEN {from_sql} AND {to_sql}
            GROUP BY l.device_ip
            ORDER BY visits DESC""",
        (domain,),
    )
    by_device = [dict(r) for r in await by_device_cur.fetchall()]

    by_date_cur = await db.execute(
        f"""SELECT DATE(timestamp) AS date, COUNT(*) AS visits
            FROM dns_logs
            WHERE domain = ? AND timestamp BETWEEN {from_sql} AND {to_sql}
            GROUP BY DATE(timestamp)
            ORDER BY date DESC""",
        (domain,),
    )
    by_date = [dict(r) for r in await by_date_cur.fetchall()]

    rows_cur = await db.execute(
        f"""SELECT l.id, l.device_ip,
                   COALESCE(d.friendly_name, d.hostname, l.device_ip) AS device_name,
                   l.domain, l.timestamp
            FROM dns_logs l
            LEFT JOIN devices d ON d.ip = l.device_ip
            WHERE l.domain = ? AND l.timestamp BETWEEN {from_sql} AND {to_sql}
            ORDER BY l.timestamp DESC
            LIMIT 500""",
        (domain,),
    )
    rows = [dict(r) for r in await rows_cur.fetchall()]

    info_cur = await db.execute(
        "SELECT ai_description FROM domain_info WHERE domain = ?", (domain,)
    )
    info = await info_cur.fetchone()

    return {
        "domain": domain,
        "ai_description": info["ai_description"] if info else None,
        "by_device": by_device,
        "by_date": by_date,
        "rows": rows,
    }
