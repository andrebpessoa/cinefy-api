#!/bin/sh
set -eu

cd /app

case "${SKIP_DB_MIGRATIONS:-false}" in
	1|true|yes|on) exec ./server ;;
esac

./run-migrations
exec ./server
