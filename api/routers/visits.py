from fastapi import APIRouter, Depends, Query
from typing import Optional
import aiosqlite
from api.database import get_db

router = APIRouter(prefix="/api/visits", tags=["visits"])


@router.get("")
async def list_visits(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    device_ip: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    offset: int = Query(0),
    db: aiosqlite.Connection = Depends(get_db),
):
    conditions = []
    params = []

    if from_date:
        conditions.append("timestamp >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("timestamp <= ?")
        params.append(to_date)
    if device_ip:
        conditions.append("device_ip = ?")
        params.append(device_ip)
    if domain:
        conditions.append("domain LIKE ?")
        params.append(f"%{domain}%")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    params += [limit, offset]

    async with db.execute(
        f"""SELECT l.id, l.device_ip, l.domain, l.timestamp,
                   COALESCE(d.friendly_name, d.hostname, l.device_ip) AS device_name
            FROM dns_logs l
            LEFT JOIN devices d ON d.ip = l.device_ip
            {where}
            ORDER BY l.timestamp DESC
            LIMIT ? OFFSET ?""",
        params,
    ) as cur:
        rows = await cur.fetchall()

    total_cur = await db.execute(
        f"SELECT COUNT(*) FROM dns_logs l {where}", params[:-2]
    )
    total = (await total_cur.fetchone())[0]

    return {"total": total, "items": [dict(r) for r in rows]}
