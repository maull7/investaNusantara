<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** "Klien Data" accounts (pemda, perusahaan, konsultan) that subscribe to Media Intelligence. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('organization')->nullable()->after('name');
            // Province codes the client may see; null = all of Indonesia.
            $table->json('client_regions')->nullable()->after('permissions');
            $table->date('subscription_ends_at')->nullable()->after('client_regions');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['organization', 'client_regions', 'subscription_ends_at']);
        });
    }
};
