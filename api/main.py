import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from api.routers import visits, domains, devices, summary
from api.database import cleanup_old_records

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_ttl_loop())
    yield


async def _ttl_loop():
    while True:
        await cleanup_old_records()
        await asyncio.sleep(86400)  # run daily


app = FastAPI(title="Traffic Logs", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(visits.router)
app.include_router(domains.router)
app.include_router(devices.router)
app.include_router(summary.router)

STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(STATIC_DIR / "index.html")
