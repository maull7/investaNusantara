<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** One row per visitor per article per day: feeds "Trending" and stops refreshes from inflating counts. */
    public function up(): void
    {
        Schema::create('article_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->date('viewed_on');
            $table->string('visitor', 40);
            $table->unique(['article_id', 'viewed_on', 'visitor']);
            $table->index(['viewed_on', 'article_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_views');
    }
};
