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
        Schema::create('challenges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('platform_id')->nullable()->constrained()->nullOnDelete();

            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category'); // Web, Pwn, Reverse Engineering
            $table->enum('difficulty', ['Easy', 'Medium', 'Hard', 'Insane'])->default('Easy');
            $table->enum('status', ['Todo', 'In Progress', 'Solved'])->default('Todo');

            $table->text('writeup')->nullable(); // Markdown
            $table->text('solve_script')->nullable(); // Script python/bash untuk automasi
            $table->jsonb('attachments')->nullable(); // Simpan metadata file
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('challenges');
    }
};
