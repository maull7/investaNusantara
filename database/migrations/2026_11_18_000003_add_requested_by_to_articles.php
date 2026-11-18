<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // AI articles: the user who ran the fetch that produced them (null = scheduled run).
        Schema::table('articles', function (Blueprint $table) {
            $table->foreignId('requested_by')->nullable()->after('author_id')->constrained('users')->nullOnDelete();
        });

        DB::table('news_items')->join('news_fetches', 'news_fetches.id', '=', 'news_items.news_fetch_id')
            ->whereNotNull('news_items.article_id')->whereNotNull('news_fetches.requested_by')
            ->orderBy('news_items.id')
            ->select('news_items.id', 'news_items.article_id', 'news_fetches.requested_by')
            ->each(fn (object $row) => DB::table('articles')->where('id', $row->article_id)->update(['requested_by' => $row->requested_by]));
    }

    public function down(): void
    {
        Schema::table('articles', fn (Blueprint $table) => $table->dropConstrainedForeignId('requested_by'));
    }
};
