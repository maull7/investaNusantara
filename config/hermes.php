<?php

return [
    // Hermes agent gateway. Locally it is reached through an SSH tunnel:
    // ssh -N -L 8642:127.0.0.1:8642 user@host
    'base_url' => env('HERMES_BASE_URL', 'http://127.0.0.1:8642/v1'),
    'token' => env('HERMES_TOKEN'),
    'connect_timeout' => (int) env('HERMES_CONNECT_TIMEOUT', 10),
    // Per HTTP request (create run / poll once).
    'timeout' => (int) env('HERMES_TIMEOUT', 90),
    // Default limit for a whole run; browsing a listing page gets more (see discovery_timeout).
    'run_timeout' => (int) env('HERMES_RUN_TIMEOUT', 120),
    'discovery_timeout' => (int) env('HERMES_DISCOVERY_TIMEOUT', 300),
    'poll_seconds' => max(1, (int) env('HERMES_POLL_SECONDS', 2)),
    'endpoints' => [
        'runs' => env('HERMES_RUNS_ENDPOINT', '/runs'),
        // Health lives at the gateway root, not under /v1.
        'health' => env('HERMES_HEALTH_URL'),
    ],
    // Runs allowed in flight at once; the rest wait in the queue.
    'max_concurrent_runs' => (int) env('HERMES_MAX_CONCURRENT_RUNS', 2),
    'queue' => env('HERMES_QUEUE', 'hermes'),
    // Try the site's RSS/Atom feed or news sitemap before asking Hermes to browse.
    'feed_discovery' => (bool) env('NEWS_FEED_DISCOVERY', true),
    // Identifies our own requests for feeds/sitemaps/robots.txt. Honest name, no browser disguise.
    'user_agent' => env('NEWS_BOT_USER_AGENT', 'NusantaraNewsBot/1.0 (+'.env('APP_URL', 'http://localhost').')'),
    // Account that authors AI articles.
    'author_email' => env('HERMES_AUTHOR_EMAIL', 'redaksi-ai@nusantaranews.local'),
];
