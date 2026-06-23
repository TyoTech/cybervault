<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('challenges', function (Blueprint $table) {
            $table->string('event_name')->nullable();
            $table->string('flag')->nullable();
            $table->integer('points')->nullable();
            $table->longText('description')->nullable();
            if (!Schema::hasColumn('challenges', 'writeup')) {
                $table->longText('writeup')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('challenges', function (Blueprint $table) {
            $table->dropColumn(['event_name', 'flag', 'points', 'description', 'writeup']);
        });
    }
};
