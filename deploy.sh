#!/bin/bash

set -e

cd /root/chatsev

supabase migration up

bun install
bun run build
chmod -R 755 dist
