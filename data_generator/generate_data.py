"""
FinSight Messy Data Generator
Generates 100K+ transactions with deliberate data quality issues.
"""

import csv
import os
import random
from datetime import datetime, timedelta

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Configuration ──

NUM_USERS = 50
NUM_ACCOUNTS = 80
NUM_TRANSACTIONS = 100_000
DATE_START = datetime(2025, 1, 1)
DATE_END = datetime(2026, 8, 31)

CURRENCIES = ["INR", "USD", "EUR", "GBP"]
INVALID_CURRENCIES = ["XYZ", "ABC", "123"]

ACCOUNT_TYPES = ["savings", "checking", "credit_card", "wallet"]
INSTITUTIONS = [
    "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra",
    "Yes Bank", "Punjab National Bank", "Bank of Baroda", "Paytm Wallet",
    "PhonePe Wallet"
]

TRANSACTION_STATUSES = ["completed", "pending", "failed", "refunded"]
TRANSACTION_TYPES = ["debit", "credit", "refund", "transfer"]

# Merchant variations (to test normalization)
MERCHANT_GROUPS = {
    "Amazon": ["Amazon", "AMAZON", "Amazon.com", "AMZN", "amazon india", "Amazon IN", "AMAZON.IN"],
    "Flipkart": ["Flipkart", "FLIPKART", "Flipkart.com", "flipkart online", "FK Retail"],
    "Swiggy": ["Swiggy", "SWIGGY", "Swiggy Food", "swiggy delivery"],
    "Zomato": ["Zomato", "ZOMATO", "Zomato Order", "zomato food"],
    "Uber": ["Uber", "UBER", "Uber India", "uber ride", "Uber Trip"],
    "Ola": ["Ola", "OLA", "Ola Cabs", "ola ride"],
    "Netflix": ["Netflix", "NETFLIX", "Netflix Inc", "netflix subscription"],
    "Spotify": ["Spotify", "SPOTIFY", "Spotify Premium"],
    "Amazon Prime": ["Amazon Prime", "PRIME VIDEO", "Prime Membership"],
    "Google": ["Google", "GOOGLE", "Google Cloud", "Google Play", "Google One"],
    "Apple": ["Apple", "APPLE", "Apple Store", "Apple Music", "Apple iCloud"],
    "Steam": ["Steam", "STEAM", "Steam Store", "Valve Steam"],
    "Adobe": ["Adobe", "ADOBE", "Adobe Creative Cloud", "Adobe Inc"],
    "Microsoft": ["Microsoft", "MICROSOFT", "Microsoft 365", "MS Office"],
    "BigBasket": ["BigBasket", "BIGBASKET", "bigbasket.com"],
    "Blinkit": ["Blinkit", "BLINKIT", "blinkit grocery"],
    "Reliance": ["Reliance", "RELIANCE", "Reliance Fresh", "Reliance Digital", "JioMart"],
    "DMart": ["DMart", "DMART", "D-Mart", "Avenue Supermarts"],
    "Myntra": ["Myntra", "MYNTRA", "Myntra Fashion"],
    "Croma": ["Croma", "CROMA", "Croma Electronics"],
    "Airtel": ["Airtel", "AIRTEL", "Bharti Airtel", "airtel recharge"],
    "Jio": ["Jio", "JIO", "Reliance Jio", "jio recharge"],
    "BSES": ["BSES", "bses electricity", "BSES Rajdhani"],
    "Tata Power": ["Tata Power", "TATA POWER", "tata electricity"],
    "IRCTC": ["IRCTC", "irctc train", "Indian Railways"],
    "MakeMyTrip": ["MakeMyTrip", "MAKEMYTRIP", "MMT"],
    "Decathlon": ["Decathlon", "DECATHLON", "decathlon sports"],
    "Starbucks": ["Starbucks", "STARBUCKS", "Starbucks Coffee"],
    "McDonalds": ["McDonalds", "MCDONALDS", "McDonald's", "MCD"],
    "PVR": ["PVR", "PVR INOX", "pvr cinemas"],
    "Gym": ["Cult Fit", "CULT FIT", "Gold's Gym", "Fitness First"],
    "Hospital": ["Apollo Hospital", "Max Hospital", "Fortis Hospital"],
    "Pharmacy": ["Apollo Pharmacy", "MedPlus", "Netmeds", "PharmEasy"],
    "Petrol": ["HP Petrol", "Indian Oil", "Bharat Petroleum", "Shell"],
    "Rent": ["Rent Payment", "House Rent", "RENT"],
    "ATM": ["ATM Withdrawal", "ATM Cash", "CASH WITHDRAWAL"],
}

CATEGORY_MAP = {
    "Amazon": 4, "Flipkart": 4, "Myntra": 6, "Croma": 5,
    "Swiggy": 3, "Zomato": 3, "Starbucks": 3, "McDonalds": 3,
    "Uber": 10, "Ola": 10,
    "Netflix": 12, "Spotify": 12, "Amazon Prime": 12, "Steam": 13,
    "Google": 22, "Apple": 22, "Adobe": 22, "Microsoft": 22,
    "BigBasket": 2, "Blinkit": 2, "Reliance": 2, "DMart": 2,
    "Airtel": 17, "Jio": 17,
    "BSES": 15, "Tata Power": 15,
    "IRCTC": 23, "MakeMyTrip": 23,
    "Decathlon": 4, "PVR": 11,
    "Gym": 18, "Hospital": 18, "Pharmacy": 19,
    "Petrol": 8, "Rent": 24, "ATM": 25,
}

DATE_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m-%d-%Y",
    "%d-%b-%Y",
    "%Y/%m/%d",
]


def random_date():
    delta = DATE_END - DATE_START
    random_days = random.randint(0, delta.days)
    return DATE_START + timedelta(days=random_days)


def random_amount(merchant_group):
    """Generate realistic amounts based on merchant type."""
    ranges = {
        "Netflix": (149, 649), "Spotify": (59, 179), "Amazon Prime": (129, 1499),
        "Google": (15, 250), "Apple": (79, 999), "Adobe": (675, 4900),
        "Microsoft": (199, 5299), "Steam": (99, 3999),
        "Amazon": (99, 25000), "Flipkart": (149, 20000), "Myntra": (299, 8000),
        "Croma": (999, 80000),
        "Swiggy": (80, 1500), "Zomato": (100, 2000), "Starbucks": (200, 800),
        "McDonalds": (99, 600),
        "Uber": (50, 1200), "Ola": (40, 1000),
        "BigBasket": (200, 5000), "Blinkit": (50, 3000), "Reliance": (100, 8000),
        "DMart": (200, 6000),
        "Airtel": (149, 999), "Jio": (149, 999),
        "BSES": (500, 5000), "Tata Power": (400, 6000),
        "IRCTC": (200, 8000), "MakeMyTrip": (1000, 50000),
        "Decathlon": (500, 15000), "PVR": (200, 1500),
        "Gym": (500, 3000), "Hospital": (200, 50000), "Pharmacy": (50, 3000),
        "Petrol": (200, 5000), "Rent": (8000, 50000), "ATM": (500, 20000),
    }
    low, high = ranges.get(merchant_group, (50, 5000))
    return round(random.uniform(low, high), 2)


def generate_users():
    first_names = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun",
        "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
        "Ananya", "Saanvi", "Aanya", "Isha", "Pari",
        "Diya", "Myra", "Sara", "Aadhya", "Kiara",
        "Rohan", "Karan", "Priya", "Neha", "Rahul",
        "Amit", "Pooja", "Sneha", "Vikram", "Deepak",
        "Riya", "Nisha", "Ankur", "Gaurav", "Meera",
        "Tanvi", "Harsh", "Pallavi", "Siddharth", "Shruti",
        "Nikhil", "Kavita", "Rajesh", "Sunita", "Mohit",
        "Akash", "Ritika", "Varun", "Divya", "Manish"
    ]
    last_names = [
        "Sharma", "Verma", "Patel", "Kumar", "Singh",
        "Gupta", "Jain", "Agarwal", "Mehta", "Shah",
        "Reddy", "Nair", "Iyer", "Pillai", "Rao",
        "Chopra", "Malhotra", "Kapoor", "Bansal", "Mittal"
    ]
    users = []
    for i in range(NUM_USERS):
        first = first_names[i % len(first_names)]
        last = random.choice(last_names)
        users.append({
            "user_id": i + 1,
            "name": f"{first} {last}",
            "email": f"{first.lower()}.{last.lower()}{i}@example.com",
        })
    return users


def generate_accounts(users):
    accounts = []
    aid = 1
    for user in users:
        num_accounts = random.randint(1, 3)
        for _ in range(num_accounts):
            if aid > NUM_ACCOUNTS:
                break
            accounts.append({
                "account_id": aid,
                "user_id": user["user_id"],
                "account_type": random.choice(ACCOUNT_TYPES),
                "currency": random.choices(CURRENCIES, weights=[70, 15, 10, 5])[0],
                "institution": random.choice(INSTITUTIONS),
            })
            aid += 1
    return accounts


def generate_merchants():
    merchants = []
    mid = 1
    for group_name, variations in MERCHANT_GROUPS.items():
        cat_id = CATEGORY_MAP.get(group_name)
        for variation in variations:
            merchants.append({
                "merchant_id": mid,
                "merchant_name": variation,
                "normalized_name": group_name,
                "category_id": cat_id,
            })
            mid += 1
    return merchants


def generate_transactions(accounts, merchants):
    transactions = []
    merchant_groups = list(MERCHANT_GROUPS.keys())
    merchant_by_group = {}
    for m in merchants:
        group = m["normalized_name"]
        if group not in merchant_by_group:
            merchant_by_group[group] = []
        merchant_by_group[group].append(m)

    for i in range(NUM_TRANSACTIONS):
        account = random.choice(accounts)
        group = random.choice(merchant_groups)
        merchant = random.choice(merchant_by_group[group])
        date = random_date()
        amount = random_amount(group)

        # Randomly pick date format for messiness
        date_fmt = random.choice(DATE_FORMATS)
        date_str = date.strftime(date_fmt)

        status = random.choices(
            TRANSACTION_STATUSES,
            weights=[85, 5, 5, 5]
        )[0]

        tx_type = "debit"
        if status == "refunded":
            tx_type = "refund"
            amount = -abs(amount)
        elif random.random() < 0.05:
            tx_type = "credit"

        currency = account["currency"]

        row = {
            "transaction_id": i + 1,
            "account_id": account["account_id"],
            "merchant_id": merchant["merchant_id"],
            "transaction_date": date_str,
            "amount": amount,
            "currency": currency,
            "status": status,
            "transaction_type": tx_type,
            "description": merchant["merchant_name"],
        }
        transactions.append(row)

    # ── Inject messiness ──

    # 2% duplicates (2000 rows)
    num_dupes = int(NUM_TRANSACTIONS * 0.02)
    for _ in range(num_dupes):
        original = random.choice(transactions[:NUM_TRANSACTIONS])
        dupe = dict(original)
        dupe["transaction_id"] = len(transactions) + 1
        transactions.append(dupe)

    # 1% missing merchant (set to None)
    num_missing_merchant = int(NUM_TRANSACTIONS * 0.01)
    indices = random.sample(range(NUM_TRANSACTIONS), num_missing_merchant)
    for idx in indices:
        transactions[idx]["merchant_id"] = ""
        transactions[idx]["description"] = ""

    # 0.5% missing category (merchant with no category)
    # Already handled by some merchants having None category

    # 0.2% invalid currency
    num_invalid_currency = int(NUM_TRANSACTIONS * 0.002)
    indices = random.sample(range(NUM_TRANSACTIONS), num_invalid_currency)
    for idx in indices:
        transactions[idx]["currency"] = random.choice(INVALID_CURRENCIES)

    # 0.1% negative amounts (not refunds)
    num_negative = int(NUM_TRANSACTIONS * 0.001)
    indices = random.sample(range(NUM_TRANSACTIONS), num_negative)
    for idx in indices:
        if transactions[idx]["transaction_type"] != "refund":
            transactions[idx]["amount"] = -abs(transactions[idx]["amount"])

    # Shuffle to mix duplicates in
    random.shuffle(transactions)

    # Re-number transaction IDs
    for i, tx in enumerate(transactions):
        tx["transaction_id"] = i + 1

    return transactions


def write_csv(filename, data, fieldnames):
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"  Written {len(data)} rows to {filepath}")


def main():
    print("Generating FinSight demo data...")

    users = generate_users()
    write_csv("users.csv", users, ["user_id", "name", "email"])

    accounts = generate_accounts(users)
    write_csv("accounts.csv", accounts, [
        "account_id", "user_id", "account_type", "currency", "institution"
    ])

    merchants = generate_merchants()
    write_csv("merchants.csv", merchants, [
        "merchant_id", "merchant_name", "normalized_name", "category_id"
    ])

    transactions = generate_transactions(accounts, merchants)
    write_csv("transactions.csv", transactions, [
        "transaction_id", "account_id", "merchant_id",
        "transaction_date", "amount", "currency",
        "status", "transaction_type", "description"
    ])

    # Generate exchange rates
    rates = []
    base_rates = {"USD": 83.5, "EUR": 91.2, "GBP": 106.3}
    current = DATE_START
    rid = 1
    while current <= DATE_END:
        for target, base_rate in base_rates.items():
            jitter = random.uniform(-2.0, 2.0)
            rates.append({
                "id": rid,
                "date": current.strftime("%Y-%m-%d"),
                "base_currency": "INR",
                "target_currency": target,
                "rate": round(1 / (base_rate + jitter), 6),
            })
            rid += 1
        current += timedelta(days=1)

    write_csv("exchange_rates.csv", rates, [
        "id", "date", "base_currency", "target_currency", "rate"
    ])

    print(f"\nDone. Total transactions: {len(transactions)}")
    print(f"  Includes ~{int(NUM_TRANSACTIONS * 0.02)} duplicates")
    print(f"  Includes ~{int(NUM_TRANSACTIONS * 0.01)} missing merchants")
    print(f"  Includes ~{int(NUM_TRANSACTIONS * 0.002)} invalid currencies")
    print(f"  Includes ~{int(NUM_TRANSACTIONS * 0.001)} negative non-refund amounts")


if __name__ == "__main__":
    main()
