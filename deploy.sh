#!/bin/bash

set -e

cd /root/chatsev

supabase db push

# Restart edge functions container
docker restart supabase-edge-functions

bun install
bun run build
chmod -R 755 dist
