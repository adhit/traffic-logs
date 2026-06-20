import os
import aiosqlite
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DB_PATH = Path(__file__).parent.parent / "data" / "traffic.db"
TTL_DAYS = int(os.getenv("TTL_DAYS", "90"))


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    return db


async def cleanup_old_records():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM dns_logs WHERE timestamp < datetime('now', ? || ' days')",
            (f"-{TTL_DAYS}",),
        )
        await db.commit()
