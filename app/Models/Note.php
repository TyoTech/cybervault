<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasUuids; // Karena kita pakai UUID di migrasi

    protected $fillable = [
        'user_id', 'category_id', 'title', 'slug', 'content', 'source'
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function category() {
        return $this->belongsTo(Category::class);
    }

    // Polymorphic relation untuk Tags
    public function tags() {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
