"""
DNS proxy that logs all queries from devices on the local network,
then forwards them to upstream DNS (8.8.8.8 by default).

Run as Administrator — port 53 requires elevated privileges.
"""

import asyncio
import os
import socket
import sqlite3
import logging
from datetime import datetime
from pathlib import Path

from dnslib import DNSRecord, DNSError
from dotenv import load_dotenv

load_dotenv()

UPSTREAM_DNS = os.getenv("UPSTREAM_DNS", "8.8.8.8")
UPSTREAM_PORT = 53
BIND_HOST = os.getenv("DNS_PROXY_HOST", "0.0.0.0")
BIND_PORT = int(os.getenv("DNS_PROXY_PORT", "53"))
DB_PATH = Path(__file__).parent.parent / "data" / "traffic.db"

# Domains to skip — background noise, not user-initiated visits
NOISE_SUFFIXES = (
    "apple.com", "icloud.com", "mzstatic.com",
    "microsoft.com", "windows.com", "windowsupdate.com",
    "googleapis.com", "gstatic.com", "doubleclick.net",
    "amazon.com", "amazontrust.com", "akadns.net",
    "akamaiedge.net", "akamaized.net",
    "crashlytics.com", "firebase.io", "firebaseio.com",
    "nr-data.net", "newrelic.com",
    "local", "localhost", "arpa",
)

NOISE_PREFIXES = (
    "metrics.", "telemetry.", "analytics.", "stats.",
    "tracking.", "log.", "logs.", "ping.", "update.",
    "push.", "notify.", "cdn.", "static.", "assets.",
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [DNS] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS dns_logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            device_ip TEXT NOT NULL,
            domain    TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS devices (
            ip            TEXT PRIMARY KEY,
            hostname      TEXT,
            friendly_name TEXT,
            last_seen     TEXT
        );

        CREATE TABLE IF NOT EXISTS domain_info (
            domain              TEXT PRIMARY KEY,
            ai_description      TEXT,
            updated_at          TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON dns_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_domain    ON dns_logs(domain);
        CREATE INDEX IF NOT EXISTS idx_logs_device    ON dns_logs(device_ip);
    """)
    conn.commit()
    conn.close()


def is_noise(domain: str) -> bool:
    d = domain.lower().rstrip(".")
    for suffix in NOISE_SUFFIXES:
        if d == suffix or d.endswith("." + suffix):
            return True
    for prefix in NOISE_PREFIXES:
        if d.startswith(prefix):
            return True
    return False


def log_query(device_ip: str, domain: str):
    if is_noise(domain):
        return
    ts = datetime.utcnow().isoformat()
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO dns_logs (device_ip, domain, timestamp) VALUES (?, ?, ?)",
            (device_ip, domain.rstrip("."), ts),
        )
        conn.execute(
            """INSERT INTO devices (ip, last_seen) VALUES (?, ?)
               ON CONFLICT(ip) DO UPDATE SET last_seen=excluded.last_seen""",
            (device_ip, ts),
        )
        conn.commit()
        conn.close()
        log.info(f"{device_ip} → {domain.rstrip('.')}")
    except Exception as e:
        log.error(f"DB write failed: {e}")


def forward_dns(data: bytes) -> bytes:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(3)
        sock.sendto(data, (UPSTREAM_DNS, UPSTREAM_PORT))
        response, _ = sock.recvfrom(4096)
    return response


class DNSProxyProtocol(asyncio.DatagramProtocol):
    def __init__(self):
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        log.info(f"DNS proxy listening on {BIND_HOST}:{BIND_PORT}")

    def datagram_received(self, data: bytes, addr):
        device_ip = addr[0]
        asyncio.get_event_loop().run_in_executor(None, self._handle, data, device_ip, addr)

    def _handle(self, data: bytes, device_ip: str, addr):
        try:
            request = DNSRecord.parse(data)
            domain = str(request.q.qname)
            log_query(device_ip, domain)
            response = forward_dns(data)
            self.transport.sendto(response, addr)
        except DNSError:
            pass
        except Exception as e:
            log.error(f"Handle error: {e}")


async def main():
    init_db()
    loop = asyncio.get_event_loop()
    transport, _ = await loop.create_datagram_endpoint(
        DNSProxyProtocol,
        local_addr=(BIND_HOST, BIND_PORT),
    )
    log.info("Press Ctrl+C to stop.")
    try:
        await asyncio.sleep(float("inf"))
    finally:
        transport.close()


if __name__ == "__main__":
    asyncio.run(main())
