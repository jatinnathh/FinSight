-- FinSight Database Schema
-- PostgreSQL on Neon

-- Drop tables if they exist (for clean re-creation)
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS pipeline_runs CASCADE;
DROP TABLE IF EXISTS data_quality_results CASCADE;

-- Users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_category VARCHAR(100)
);

-- Accounts
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    institution VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merchants
CREATE TABLE merchants (
    merchant_id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255),
    category_id INTEGER REFERENCES categories(category_id)
);

-- Transactions
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    merchant_id INTEGER REFERENCES merchants(merchant_id),
    transaction_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'completed',
    transaction_type VARCHAR(20) DEFAULT 'debit',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets
CREATE TABLE budgets (
    budget_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(category_id),
    monthly_limit NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    merchant_id INTEGER NOT NULL REFERENCES merchants(merchant_id),
    amount NUMERIC(12, 2) NOT NULL,
    frequency VARCHAR(20) DEFAULT 'monthly',
    next_billing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exchange Rates
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    base_currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10) NOT NULL,
    rate NUMERIC(12, 6) NOT NULL,
    UNIQUE(date, base_currency, target_currency)
);

-- Pipeline Runs (for pipeline status UI)
CREATE TABLE pipeline_runs (
    run_id SERIAL PRIMARY KEY,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running',
    rows_processed INTEGER DEFAULT 0,
    rows_rejected INTEGER DEFAULT 0,
    error_message TEXT,
    steps JSONB DEFAULT '[]'
);

-- Data Quality Results
CREATE TABLE data_quality_results (
    result_id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES pipeline_runs(run_id),
    check_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    details TEXT,
    affected_rows INTEGER DEFAULT 0,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_merchants_category ON merchants(category_id);
CREATE INDEX idx_merchants_normalized ON merchants(normalized_name);
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_exchange_rates_date ON exchange_rates(date);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);

-- Seed categories
INSERT INTO categories (category_name, parent_category) VALUES
    ('Food', NULL),
    ('Groceries', 'Food'),
    ('Restaurants', 'Food'),
    ('Shopping', NULL),
    ('Electronics', 'Shopping'),
    ('Clothing', 'Shopping'),
    ('Transport', NULL),
    ('Fuel', 'Transport'),
    ('Public Transit', 'Transport'),
    ('Ride Sharing', 'Transport'),
    ('Entertainment', NULL),
    ('Streaming', 'Entertainment'),
    ('Gaming', 'Entertainment'),
    ('Utilities', NULL),
    ('Electricity', 'Utilities'),
    ('Internet', 'Utilities'),
    ('Mobile', 'Utilities'),
    ('Health', NULL),
    ('Pharmacy', 'Health'),
    ('Insurance', 'Health'),
    ('Education', NULL),
    ('Subscriptions', NULL),
    ('Travel', NULL),
    ('Rent', NULL),
    ('Other', NULL);
