# syntax=docker/dockerfile:1

# ---- Runtime base: FrankenPHP (Caddy + PHP in one binary) with the extensions the app uses.
FROM dunglas/frankenphp:1-php8.4-bookworm AS base
RUN install-php-extensions pdo_mysql redis pcntl intl gd zip bcmath opcache
WORKDIR /app

# ---- Build: Composer deps, then the Vite bundle. Wayfinder runs `php artisan` during
#      the build, so this stage needs PHP + vendor + Node together.
FROM base AS build
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
    && npm run build \
    && rm -rf node_modules

# ---- Production image: app code + vendor + built assets, no Node, no Composer.
FROM base AS app
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    PHP_INI_SCAN_DIR=":$PHP_INI_DIR/app.conf.d"

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini $PHP_INI_DIR/app.conf.d/zz-app.ini
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/app-entrypoint

COPY --from=build --chown=www-data:www-data /app /app

# Run unprivileged: the app listens on a high port, so no capabilities are needed.
RUN setcap -r /usr/local/bin/frankenphp \
    && mkdir -p /data/caddy /config/caddy \
        /app/storage/app/public /app/storage/logs /app/bootstrap/cache \
        /app/storage/framework/cache/data /app/storage/framework/sessions /app/storage/framework/views \
    && chown -R www-data:www-data /data /config /app/storage /app/bootstrap/cache \
    && chmod +x /usr/local/bin/app-entrypoint
USER www-data

ENTRYPOINT ["app-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
