#!/bin/bash

set -e

# Run all migrations using Supabase CLI
echo "Running database migrations..."
supabase db push

# Copy edge functions
docker cp /root/chatsev/supabase/functions/. supabase-edge-functions:/home/deno/functions/

# Restart edge functions container
docker restart supabase-edge-functions

# Build frontend
cd /root/chatsev
[ -d "dist" ] && rm -rf dist
bun install
bun run build
chmod -R 755 dist
