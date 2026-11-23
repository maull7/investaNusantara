<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Browsers that asked for breaking-news notifications, and which provinces they follow. */
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('endpoint');
            // Endpoints are long URLs: look them up by hash.
            $table->char('endpoint_hash', 64)->unique();
            $table->string('public_key');
            $table->string('auth_token');
            // Province codes; national breaking news goes to every subscription.
            $table->json('provinces');
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();
        });

        Schema::table('articles', function (Blueprint $table) {
            // Set when the breaking-news push went out, so an article is pushed at most once.
            $table->timestamp('pushed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('articles', fn (Blueprint $table) => $table->dropColumn('pushed_at'));
        Schema::dropIfExists('push_subscriptions');
    }
};
