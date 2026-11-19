<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Media Intelligence: reads per article per day (articles.views is only a lifetime total,
 * so trends need this), and the tone of each article.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_daily_views', function (Blueprint $table) {
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('views')->default(0);
            $table->primary(['article_id', 'date']);
            $table->index('date');
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->string('sentiment', 10)->nullable()->after('social_post'); // positif | netral | negatif
            $table->index(['sentiment', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropIndex(['sentiment', 'published_at']);
            $table->dropColumn('sentiment');
        });
        Schema::dropIfExists('article_daily_views');
    }
};
