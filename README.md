# expenses-autosync

> Vibe-coded with Claude. 🤖

Automatically syncs expenses from **Splitwise** into **BudgetBakers Wallet** on a scheduled basis.

## What it does

- Polls Splitwise every hour for new expenses
- Maps each expense (amount, category, date, description) to a BudgetBakers Wallet record
- Attaches `AutoSync` and `SplitWise` hashtag labels to every synced record
- Falls back to the `Others` category for any Splitwise category that doesn't exist in Wallet
- Tracks the last sync cursor in a local SQLite database so no expense is double-synced
- Exposes a webhook server (port 3000) for future event-driven triggers

## Stack

- **Runtime**: Node.js + TypeScript (via `tsx`)
- **Sources**: Splitwise REST API
- **Destinations**: BudgetBakers Wallet (direct CouchDB writes via `budgetbakers-wallet-importer`)
- **State**: SQLite (`better-sqlite3`)
- **Scheduling**: `node-cron`

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials
2. Install dependencies: `npm install`
3. Authenticate with BudgetBakers: `npm run login:budgetbakers`
4. Start: `npm start`

## Environment variables

See `.env.example`.
