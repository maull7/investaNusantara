<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_sources', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->after('active')->constrained('users')->nullOnDelete();
        });

        // Existing sources: take the author from the audit trail ("news_source.created").
        DB::table('activity_logs')
            ->where('event', 'news_source.created')
            ->where('subject_type', 'App\\Models\\NewsSource')
            ->whereNotNull('user_id')
            ->orderBy('id')
            ->get(['subject_id', 'user_id'])
            ->each(fn ($log) => DB::table('news_sources')->where('id', $log->subject_id)->whereNull('created_by')
                ->whereExists(fn ($q) => $q->from('users')->where('id', $log->user_id))
                ->update(['created_by' => $log->user_id]));
    }

    public function down(): void
    {
        Schema::table('news_sources', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
        });
    }
};
