#!/bin/sh
set -eu

cd /app

if [ "${SKIP_DB_MIGRATIONS:-0}" = "1" ]; then
	exec ./server
fi

./run-migrations
exec ./server
