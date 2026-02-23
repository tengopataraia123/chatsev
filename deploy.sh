#!/bin/bash

set -e

# Get list of applied migrations from database
APPLIED=$(docker exec supabase-db psql -U postgres -d postgres -t -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | tr -d ' ' || echo "")

# Apply only new migrations
for migration in supabase/migrations/*.sql; do
    if [ -f "$migration" ]; then
        MIGRATION_VERSION=$(basename "$migration" | cut -d'_' -f1)
        if ! echo "$APPLIED" | grep -q "$MIGRATION_VERSION"; then
            docker exec -i supabase-db psql -U postgres postgres < "$migration"
        fi
    fi
done

# Copy only updated edge functions
docker exec supabase-edge-functions sh -c "mkdir -p /home/deno/functions"
rsync -av --update supabase/functions/ supabase-edge-functions:/home/deno/functions/ || \
    docker cp supabase/functions/. supabase-edge-functions:/home/deno/functions/

# Restart edge functions container
docker restart supabase-edge-functions

# Build frontend
cd /root/chatsev
[ -d "dist" ] && rm -rf dist
bun install
bun run build
chmod -R 755 dist
