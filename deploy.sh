#!/bin/bash

set -e

cd /root/chatsev

supabase migration updf

# Restart edge functions container
docker restart supabase-edge-functions

bun install
bun run build
chmod -R 755 dist
