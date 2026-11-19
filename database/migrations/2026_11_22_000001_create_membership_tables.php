<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Membership: plans shown on the public "Langganan" page, and readers' applications.
 * An approved application turns the reader into a Klien Data with the plan's provinces.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('tagline')->nullable();
            $table->unsignedBigInteger('price')->default(0); // rupiah per month; 0 = "Hubungi kami"
            $table->unsignedSmallInteger('max_provinces')->nullable(); // null = all of Indonesia
            $table->json('benefits');
            $table->boolean('highlighted')->default(false);
            $table->boolean('active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('membership_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('membership_plan_id')->constrained()->restrictOnDelete();
            $table->string('organization');
            $table->string('contact', 100); // WhatsApp / phone
            $table->json('provinces')->nullable();
            $table->unsignedTinyInteger('months')->default(1);
            $table->text('note')->nullable();
            $table->string('status', 20)->default('pending'); // pending | approved | rejected
            $table->text('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_applications');
        Schema::dropIfExists('membership_plans');
    }
};
