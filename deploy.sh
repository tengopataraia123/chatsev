#!/bin/bash

set -e

cd /root/chatsev

supabase stop
supabase start

bun install
bun run build
chmod -R 755 dist
