#!/bin/bash

set -e

cd /var/www/chatsev

supabase migration up

bun install
bun run build
chmod -R 755 dist
