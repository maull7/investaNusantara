<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** National agenda: event categories, public submissions and admin-approved "unggulan" events. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('directory_entries', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name'); // events get a public page
            $table->string('category', 20)->nullable()->after('type'); // event: daerah|seminar|workshop|festival|pameran
            $table->string('organizer')->nullable()->after('address');
            $table->string('contact')->nullable()->after('organizer'); // submissions only; never shown publicly
            $table->foreignId('submitted_by')->nullable()->after('source_url')->constrained('users')->nullOnDelete();
            $table->boolean('featured_requested')->default(false)->after('submitted_by');
            $table->timestamp('featured_at')->nullable()->after('featured_requested');

            $table->index(['type', 'verified_at', 'starts_on']);
        });
    }

    public function down(): void
    {
        Schema::table('directory_entries', function (Blueprint $table) {
            $table->dropIndex(['type', 'verified_at', 'starts_on']);
            $table->dropConstrainedForeignId('submitted_by');
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'category', 'organizer', 'contact', 'featured_requested', 'featured_at']);
        });
    }
};
