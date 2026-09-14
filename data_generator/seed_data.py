"""
Seed generated CSV data into Neon PostgreSQL.
"""

import os
import csv
import sys
import asyncio
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.db.database import get_pool, close_pool, execute_command, init_schema

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

DATE_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m-%d-%Y",
    "%d-%b-%Y",
    "%Y/%m/%d",
]


def parse_date(date_str):
    """Try multiple date formats."""
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


async def seed():
    print("Initializing schema...")
    await init_schema()
    print("Schema initialized.")

    pool = await get_pool()

    # Seed users
    print("Seeding users...")
    with open(os.path.join(DATA_DIR, "users.csv"), "r") as f:
        reader = csv.DictReader(f)
        async with pool.acquire() as conn:
            for row in reader:
                await conn.execute(
                    "INSERT INTO users (user_id, name, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                    int(row["user_id"]), row["name"], row["email"]
                )
    # Reset sequence
    async with pool.acquire() as conn:
        await conn.execute("SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users))")

    # Seed accounts
    print("Seeding accounts...")
    with open(os.path.join(DATA_DIR, "accounts.csv"), "r") as f:
        reader = csv.DictReader(f)
        async with pool.acquire() as conn:
            for row in reader:
                await conn.execute(
                    "INSERT INTO accounts (account_id, user_id, account_type, currency, institution) "
                    "VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
                    int(row["account_id"]), int(row["user_id"]),
                    row["account_type"], row["currency"], row["institution"]
                )
    async with pool.acquire() as conn:
        await conn.execute("SELECT setval('accounts_account_id_seq', (SELECT MAX(account_id) FROM accounts))")

    # Seed merchants
    print("Seeding merchants...")
    with open(os.path.join(DATA_DIR, "merchants.csv"), "r") as f:
        reader = csv.DictReader(f)
        async with pool.acquire() as conn:
            for row in reader:
                cat_id = int(row["category_id"]) if row["category_id"] else None
                await conn.execute(
                    "INSERT INTO merchants (merchant_id, merchant_name, normalized_name, category_id) "
                    "VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                    int(row["merchant_id"]), row["merchant_name"],
                    row["normalized_name"], cat_id
                )
    async with pool.acquire() as conn:
        await conn.execute("SELECT setval('merchants_merchant_id_seq', (SELECT MAX(merchant_id) FROM merchants))")

    # Seed transactions (batch)
    print("Seeding transactions...")
    with open(os.path.join(DATA_DIR, "transactions.csv"), "r") as f:
        reader = csv.DictReader(f)
        batch = []
        count = 0
        async with pool.acquire() as conn:
            for row in reader:
                merchant_id = int(row["merchant_id"]) if row["merchant_id"] else None
                tx_date = parse_date(row["transaction_date"])
                if tx_date is None:
                    continue

                batch.append((
                    int(row["account_id"]),
                    merchant_id,
                    tx_date,
                    float(row["amount"]),
                    row["currency"],
                    row["status"],
                    row["transaction_type"],
                    row["description"],
                ))
                count += 1

                if len(batch) >= 1000:
                    await conn.executemany(
                        "INSERT INTO transactions "
                        "(account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description) "
                        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                        batch
                    )
                    batch = []
                    if count % 10000 == 0:
                        print(f"  {count} transactions...")

            if batch:
                await conn.executemany(
                    "INSERT INTO transactions "
                    "(account_id, merchant_id, transaction_date, amount, currency, status, transaction_type, description) "
                    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                    batch
                )

    print(f"  Total: {count} transactions seeded.")

    # Seed exchange rates
    print("Seeding exchange rates...")
    with open(os.path.join(DATA_DIR, "exchange_rates.csv"), "r") as f:
        reader = csv.DictReader(f)
        batch = []
        async with pool.acquire() as conn:
            for row in reader:
                batch.append((
                    datetime.strptime(row["date"], "%Y-%m-%d").date(),
                    row["base_currency"],
                    row["target_currency"],
                    float(row["rate"]),
                ))
                if len(batch) >= 500:
                    await conn.executemany(
                        "INSERT INTO exchange_rates (date, base_currency, target_currency, rate) "
                        "VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                        batch
                    )
                    batch = []
            if batch:
                await conn.executemany(
                    "INSERT INTO exchange_rates (date, base_currency, target_currency, rate) "
                    "VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                    batch
                )

    print("Done seeding.")
    await close_pool()


if __name__ == "__main__":
    asyncio.run(seed())
