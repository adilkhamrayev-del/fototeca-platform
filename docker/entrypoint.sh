#!/bin/sh
# Applies the schema (idempotent — safe on every container start, including
# restarts of an already-migrated database) before handing off to the
# standalone Next.js server. Seeding and legacy-order migration are
# deliberately NOT run here — they're one-time, explicit operator actions
# (see DEPLOY.md), not something that should silently re-run on every
# `docker compose restart`.
set -e

echo "Applying database schema..."
npm run db:apply-schema

echo "Starting server..."
exec node server.js
