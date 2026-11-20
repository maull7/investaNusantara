<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_fetches', fn (Blueprint $table) => $table->json('inspected_links')->nullable());
    }

    public function down(): void
    {
        Schema::table('news_fetches', fn (Blueprint $table) => $table->dropColumn('inspected_links'));
    }
};
