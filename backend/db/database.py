import os
import ssl
import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

DATABASE_URL = os.getenv("DB_URL", "")

# Strip channel_binding param — asyncpg doesn't support it and it causes hangs
_clean_url = DATABASE_URL
for param in ["channel_binding=require", "&channel_binding=require"]:
    _clean_url = _clean_url.replace(param, "")
# Clean up trailing ? or &
_clean_url = _clean_url.rstrip("?&")

# Connection pool
_pool = None


async def get_pool():
    global _pool
    if _pool is None:
        # Neon requires SSL
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        _pool = await asyncpg.create_pool(
            _clean_url,
            min_size=2,
            max_size=10,
            ssl=ctx
        )
    return _pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def execute_query(query: str, *args):
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)


async def execute_one(query: str, *args):
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(query, *args)


async def execute_command(query: str, *args):
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)


async def execute_many(query: str, args_list: list):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.executemany(query, args_list)


async def init_schema():
    """Run schema.sql to initialize database tables."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r") as f:
        schema_sql = f.read()
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(schema_sql)
