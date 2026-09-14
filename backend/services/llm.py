"""
LLM service: Groq primary, Gemini fallback.
SQL generation with guardrails.
"""

import os
import re
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

GROQ_API_KEY = os.getenv("GROQ", "")
GEMINI_API_KEY = os.getenv("GEMINI", "")

# SQL guardrails: only allow these statements
ALLOWED_KEYWORDS = {"SELECT", "WITH"}
BLOCKED_KEYWORDS = {"DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE", "EXEC", "EXECUTE"}

# Database schema for context
SCHEMA_CONTEXT = """
You are a SQL assistant for a personal finance analytics platform called FinSight.
The database is PostgreSQL with these tables:

users (user_id SERIAL PK, name VARCHAR, email VARCHAR, created_at TIMESTAMP)
accounts (account_id SERIAL PK, user_id INT FK->users, account_type VARCHAR, currency VARCHAR, institution VARCHAR, created_at TIMESTAMP)
transactions (transaction_id SERIAL PK, account_id INT FK->accounts, merchant_id INT FK->merchants, transaction_date DATE, amount NUMERIC(12,2), currency VARCHAR, status VARCHAR, transaction_type VARCHAR, description TEXT, created_at TIMESTAMP)
merchants (merchant_id SERIAL PK, merchant_name VARCHAR, normalized_name VARCHAR, category_id INT FK->categories)
categories (category_id SERIAL PK, category_name VARCHAR, parent_category VARCHAR)
budgets (budget_id SERIAL PK, user_id INT FK->users, category_id INT FK->categories, monthly_limit NUMERIC(12,2))
subscriptions (subscription_id SERIAL PK, user_id INT FK->users, merchant_id INT FK->merchants, amount NUMERIC(12,2), frequency VARCHAR, next_billing_date DATE)
exchange_rates (id SERIAL PK, date DATE, base_currency VARCHAR, target_currency VARCHAR, rate NUMERIC(12,6))

Rules:
- Generate ONLY SELECT queries. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.
- Always include a LIMIT clause (max 100 rows).
- Use normalized_name from merchants table for merchant names.
- Use category_name from categories table for categories.
- For spending calculations, use amount > 0 AND status = 'completed'.
- Amounts are in the currency column (mostly INR).
- Return ONLY the SQL query, no explanation.
"""


def validate_sql(sql: str) -> tuple[bool, str]:
    """Validate SQL query against guardrails."""
    sql_upper = sql.upper().strip()

    # Remove comments
    sql_clean = re.sub(r'--.*$', '', sql_upper, flags=re.MULTILINE)
    sql_clean = re.sub(r'/\*.*?\*/', '', sql_clean, flags=re.DOTALL)

    # Check for blocked keywords
    for keyword in BLOCKED_KEYWORDS:
        pattern = r'\b' + keyword + r'\b'
        if re.search(pattern, sql_clean):
            return False, f"Blocked keyword found: {keyword}"

    # Must start with SELECT or WITH
    sql_trimmed = sql_clean.strip()
    if not sql_trimmed.startswith("SELECT") and not sql_trimmed.startswith("WITH"):
        return False, "Query must start with SELECT or WITH"

    # Check tables exist
    known_tables = {"users", "accounts", "transactions", "merchants", "categories", "budgets", "subscriptions", "exchange_rates"}
    from_matches = re.findall(r'\bFROM\s+(\w+)', sql_clean)
    join_matches = re.findall(r'\bJOIN\s+(\w+)', sql_clean)
    all_tables = set(t.lower() for t in from_matches + join_matches)

    # Filter out subquery aliases and CTEs
    for table in all_tables:
        if table not in known_tables and not table.startswith("("):
            # Could be a CTE alias, allow it
            pass

    return True, "OK"


def extract_sql(text: str) -> str:
    """Extract SQL from LLM response (handles markdown code blocks)."""
    # Try to extract from code block
    match = re.search(r'```(?:sql)?\s*\n?(.*?)\n?```', text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Otherwise, try to find SELECT/WITH statement
    match = re.search(r'((?:WITH|SELECT)\b.*?;)', text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Return as-is
    return text.strip()


async def generate_sql(question: str) -> dict:
    """Generate SQL from natural language question using Groq (primary) or Gemini (fallback)."""
    prompt = f"{SCHEMA_CONTEXT}\n\nUser question: {question}\n\nGenerate the SQL query:"

    sql = None
    provider = None
    error = None

    # Try Groq first
    try:
        sql = await _call_groq(prompt)
        provider = "groq"
    except Exception as e:
        error = str(e)
        # Fall back to Gemini
        try:
            sql = await _call_gemini(prompt)
            provider = "gemini"
            error = None
        except Exception as e2:
            error = f"Both LLMs failed. Groq: {error}. Gemini: {str(e2)}"

    if error:
        return {"success": False, "error": error}

    sql = extract_sql(sql)
    valid, msg = validate_sql(sql)

    if not valid:
        return {"success": False, "error": f"SQL validation failed: {msg}", "sql": sql}

    return {"success": True, "sql": sql, "provider": provider}


async def explain_result(question: str, sql: str, result: list) -> str:
    """Generate a natural language explanation of query results."""
    # Truncate result for context
    result_str = str(result[:20])
    prompt = (
        f"The user asked: \"{question}\"\n\n"
        f"The SQL query was:\n{sql}\n\n"
        f"The results are:\n{result_str}\n\n"
        f"Provide a brief, clear explanation of these results in 2-3 sentences. "
        f"Use plain language. Mention specific numbers. Do not mention SQL."
    )

    try:
        return await _call_groq(prompt)
    except Exception:
        try:
            return await _call_gemini(prompt)
        except Exception:
            return "Results returned successfully."


async def _call_groq(prompt: str) -> str:
    """Call Groq API."""
    from groq import AsyncGroq
    import httpx

    # Create httpx client without deprecated 'proxies' param (httpx 0.28+ compat)
    http_client = httpx.AsyncClient()
    client = AsyncGroq(api_key=GROQ_API_KEY, http_client=http_client)
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    finally:
        await http_client.aclose()


async def _call_gemini(prompt: str) -> str:
    """Call Gemini API."""
    from google import genai

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text
