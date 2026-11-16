<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Hierarchical Kemendagri regions: 32 (province) > 32.73 (city) > 32.73.01 (district) > 32.73.01.1001 (village).
        Schema::create('regions', function (Blueprint $table) {
            $table->string('code', 13)->primary();
            $table->string('parent_code', 13)->nullable()->index();
            $table->unsignedTinyInteger('level');
            $table->string('type', 20)->nullable();
            $table->string('name', 100);
            $table->string('slug', 120);
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->unique(['parent_code', 'slug']);
            $table->foreign('parent_code')->references('code')->on('regions');
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('contributor')->after('password');
            $table->string('region_code', 13)->nullable()->after('role');
            $table->foreign('region_code')->references('code')->on('regions')->nullOnDelete();
        });

        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('body');
            $table->string('cover_path')->nullable();
            $table->foreignId('category_id')->constrained();
            $table->string('region_code', 13)->nullable();
            $table->foreign('region_code')->references('code')->on('regions');
            $table->foreignId('author_id')->constrained('users');
            $table->foreignId('editor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('draft');
            $table->boolean('is_headline')->default(false);
            $table->boolean('is_breaking')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('views')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index(['region_code', 'status', 'published_at']);
            $table->index(['category_id', 'status', 'published_at']);
            if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                $table->fullText(['title', 'excerpt']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['region_code']);
            $table->dropColumn(['role', 'region_code']);
        });
        Schema::dropIfExists('categories');
        Schema::dropIfExists('regions');
    }
};
