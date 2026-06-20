from fastapi import APIRouter, Depends
import aiosqlite
import asyncio
from api.database import get_db
from api.models import SummaryRequest
from api import ai

router = APIRouter(prefix="/api/summary", tags=["summary"])


@router.post("")
async def generate_summary(
    body: SummaryRequest,
    db: aiosqlite.Connection = Depends(get_db),
):
    from_date, to_date = body.from_date, body.to_date

    total_cur = await db.execute(
        "SELECT COUNT(*) FROM dns_logs WHERE timestamp BETWEEN ? AND ?",
        (from_date, to_date),
    )
    total_visits = (await total_cur.fetchone())[0]

    unique_cur = await db.execute(
        "SELECT COUNT(DISTINCT domain) FROM dns_logs WHERE timestamp BETWEEN ? AND ?",
        (from_date, to_date),
    )
    unique_domains = (await unique_cur.fetchone())[0]

    device_cur = await db.execute(
        "SELECT COUNT(DISTINCT device_ip) FROM dns_logs WHERE timestamp BETWEEN ? AND ?",
        (from_date, to_date),
    )
    device_count = (await device_cur.fetchone())[0]

    top_cur = await db.execute(
        """SELECT domain, COUNT(*) AS visits
           FROM dns_logs
           WHERE timestamp BETWEEN ? AND ?
           GROUP BY domain ORDER BY visits DESC LIMIT 15""",
        (from_date, to_date),
    )
    top_domains = [dict(r) for r in await top_cur.fetchall()]

    devices_cur = await db.execute(
        """SELECT l.device_ip AS ip,
                  COALESCE(d.friendly_name, d.hostname, l.device_ip) AS name,
                  COUNT(*) AS visits
           FROM dns_logs l
           LEFT JOIN devices d ON d.ip = l.device_ip
           WHERE l.timestamp BETWEEN ? AND ?
           GROUP BY l.device_ip ORDER BY visits DESC""",
        (from_date, to_date),
    )
    devices = [dict(r) for r in await devices_cur.fetchall()]

    hourly_cur = await db.execute(
        """SELECT CAST(strftime('%H', timestamp) AS INTEGER) AS hour, COUNT(*) AS visits
           FROM dns_logs
           WHERE timestamp BETWEEN ? AND ?
           GROUP BY hour ORDER BY visits DESC LIMIT 5""",
        (from_date, to_date),
    )
    hourly = [dict(r) for r in await hourly_cur.fetchall()]

    stats = {
        "from_date": from_date,
        "to_date": to_date,
        "total_visits": total_visits,
        "unique_domains": unique_domains,
        "device_count": device_count,
        "top_domains": top_domains,
        "devices": devices,
        "hourly": hourly,
    }

    text = await asyncio.get_event_loop().run_in_executor(None, ai.generate_summary, stats)
    return {"summary": text, "stats": stats}
