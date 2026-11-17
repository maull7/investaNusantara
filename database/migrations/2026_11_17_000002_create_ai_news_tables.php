<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Websites Hermes browses for news.
        Schema::create('news_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('url', 2048);
            $table->string('region_code', 13)->nullable();
            $table->foreign('region_code')->references('code')->on('regions')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->text('instruction')->nullable();
            $table->unsignedTinyInteger('max_articles')->default(5);
            // Null = manual only.
            $table->unsignedSmallInteger('fetch_interval_minutes')->nullable();
            $table->boolean('auto_publish')->default(true);
            $table->boolean('active')->default(true);
            $table->timestamp('last_fetched_at')->nullable();
            $table->timestamp('last_success_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
        });

        // One "Ambil berita" run of a source: Hermes lists the latest article links.
        Schema::create('news_fetches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_source_id')->constrained()->cascadeOnDelete();
            $table->string('trigger', 20)->default('manual');
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('queued');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedSmallInteger('found')->default(0);
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'updated_at']);
        });

        // One article link found by a fetch, summarized by Hermes into an article.
        Schema::create('news_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_fetch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('news_source_id')->constrained()->cascadeOnDelete();
            $table->string('url', 2048);
            $table->char('url_hash', 64)->unique();
            $table->string('title');
            $table->string('status', 20)->default('queued');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->foreignId('article_id')->nullable()->constrained()->nullOnDelete();
            $table->text('error')->nullable();
            $table->timestamp('source_published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'updated_at']);
            $table->index('created_at');
        });

        // Every call to Hermes, with its run id so a retry resumes polling instead of paying twice.
        Schema::create('ai_runs', function (Blueprint $table) {
            $table->id();
            $table->nullableMorphs('subject');
            $table->string('operation', 40);
            $table->string('hermes_run_id')->nullable()->index();
            $table->string('status', 20)->default('running');
            $table->longText('input');
            $table->json('output')->nullable();
            $table->text('error')->nullable();
            $table->unsignedInteger('input_tokens')->nullable();
            $table->unsignedInteger('output_tokens')->nullable();
            $table->unsignedInteger('total_tokens')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->string('source_name')->nullable()->after('cover_path');
            $table->string('source_url', 2048)->nullable()->after('source_name');
            $table->boolean('is_ai_generated')->default(false)->after('source_url');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn(['source_name', 'source_url', 'is_ai_generated']);
        });
        Schema::dropIfExists('ai_runs');
        Schema::dropIfExists('news_items');
        Schema::dropIfExists('news_fetches');
        Schema::dropIfExists('news_sources');
    }
};
