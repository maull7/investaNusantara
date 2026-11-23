#!/bin/sh
set -e

# A socket left by a crashed run blocks Caddy from listening again.
rm -f /run/app/app.sock

# Caches are built from the real environment of this container, at start.
php artisan storage:link --force >/dev/null 2>&1 || true
php artisan optimize

# Only the web container migrates (RUN_MIGRATIONS=true); workers just start.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    php artisan migrate --force
fi

exec "$@"
