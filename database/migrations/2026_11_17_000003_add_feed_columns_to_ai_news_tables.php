<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_sources', function (Blueprint $table) {
            // RSS/Atom feed or news sitemap; filled automatically when found.
            $table->string('feed_url', 2048)->nullable()->after('url');
        });
        Schema::table('news_fetches', function (Blueprint $table) {
            // How the article list was obtained: rss | sitemap | hermes.
            $table->string('via', 20)->nullable()->after('trigger');
        });
        Schema::table('news_items', function (Blueprint $table) {
            // What the feed already told us; backup material when the page can't be opened.
            $table->text('feed_excerpt')->nullable()->after('title');
            $table->string('image_url', 2048)->nullable()->after('feed_excerpt');
        });
    }

    public function down(): void
    {
        Schema::table('news_items', fn (Blueprint $table) => $table->dropColumn(['feed_excerpt', 'image_url']));
        Schema::table('news_fetches', fn (Blueprint $table) => $table->dropColumn('via'));
        Schema::table('news_sources', fn (Blueprint $table) => $table->dropColumn('feed_url'));
    }
};
