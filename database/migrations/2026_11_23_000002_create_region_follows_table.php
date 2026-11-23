<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('region_follows', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('region_code', 13);
            $table->foreign('region_code')->references('code')->on('regions')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'region_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('region_follows');
    }
};
