from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from api.database import get_db
from api.models import DeviceUpdate

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("")
async def list_devices(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        """SELECT ip, hostname, friendly_name, last_seen
           FROM devices
           ORDER BY last_seen DESC"""
    ) as cur:
        return [dict(r) for r in await cur.fetchall()]


@router.put("/{ip}")
async def update_device(
    ip: str,
    body: DeviceUpdate,
    db: aiosqlite.Connection = Depends(get_db),
):
    cur = await db.execute("SELECT ip FROM devices WHERE ip = ?", (ip,))
    if not await cur.fetchone():
        raise HTTPException(status_code=404, detail="Device not found")
    await db.execute(
        "UPDATE devices SET friendly_name = ? WHERE ip = ?",
        (body.friendly_name, ip),
    )
    await db.commit()
    return {"ok": True}
