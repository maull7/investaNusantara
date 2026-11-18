<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            // "Ringkasan" button: the source's own headline and its first 50 words.
            $table->string('source_title')->nullable()->after('source_url');
            $table->text('source_excerpt')->nullable()->after('source_title');
        });

        // One AI review per article, written once and shown to every reader after that.
        Schema::create('article_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('queued');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->json('points')->nullable();
            $table->text('body')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
        });

        // Backfill AI articles from what the pipeline already kept: the item title and Hermes' copy of the opening.
        DB::table('news_items')->whereNotNull('article_id')->orderBy('id')->each(function (object $item) {
            $output = json_decode((string) DB::table('ai_runs')
                ->where('subject_type', 'App\\Models\\NewsItem')->where('subject_id', $item->id)
                ->where('operation', 'summarize')->where('status', 'completed')
                ->latest('id')->value('output'), true) ?: [];
            $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) ($output['source_opening'] ?? $item->feed_excerpt ?? ''))));

            DB::table('articles')->where('id', $item->article_id)->update([
                'source_title' => Str::limit(trim((string) ($output['source_title'] ?? '')) ?: $item->title, 250, ''),
                'source_excerpt' => $text !== '' ? Str::words($text, 50, '…') : null,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_reviews');
        Schema::table('articles', fn (Blueprint $table) => $table->dropColumn(['source_title', 'source_excerpt']));
    }
};
