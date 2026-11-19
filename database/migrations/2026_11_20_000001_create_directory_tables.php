<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Regional directory ("Wikipedia daerah"): one profile per province/regency/city,
 * plus tourism spots, UMKM and events. AI drafts, an editor verifies; readers
 * only see verified rows. Every fact and entry carries its source.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('region_profiles', function (Blueprint $table) {
            $table->string('region_code', 13)->primary();
            $table->foreign('region_code')->references('code')->on('regions')->cascadeOnDelete();
            // {"population": {"value": "1.052.359", "source": "https://...", "as_of": "2024"}, ...}
            $table->json('facts')->nullable();
            $table->text('description')->nullable();
            $table->string('description_source', 2048)->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('directory_entries', function (Blueprint $table) {
            $table->id();
            $table->string('region_code', 13);
            $table->foreign('region_code')->references('code')->on('regions')->cascadeOnDelete();
            $table->string('type', 20); // see DirectoryEntry::TYPES
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('website', 2048)->nullable();
            $table->string('source_url', 2048)->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['region_code', 'type', 'verified_at']);
        });

        // One Hermes research task per request (status/attempts/error, like article_reviews).
        Schema::create('region_drafts', function (Blueprint $table) {
            $table->id();
            $table->string('region_code', 13);
            $table->foreign('region_code')->references('code')->on('regions')->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('queued');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['region_code', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('region_drafts');
        Schema::dropIfExists('directory_entries');
        Schema::dropIfExists('region_profiles');
    }
};
