<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cybervault_tables', function (Blueprint $table) {
            //
        });

        Schema::table('notes', function (Blueprint $table) {
            $table->index('title');
        });

        Schema::table('payloads', function (Blueprint $table) {
            $table->index('title');
            $table->index('category');
        });

        Schema::table('challenges', function (Blueprint $table) {
            $table->index(['platform_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cybervault_tables', function (Blueprint $table) {
            //
        });
        Schema::table('notes', function (Blueprint $table) {
            $table->dropIndex(['title']);
        });
    }
};
