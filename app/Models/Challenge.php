<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Challenge extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'event_name', 'title', 'slug', 'category',
        'difficulty', 'status', 'points', 'flag', 'description', 'writeup'
    ];

    protected $casts = [
        'attachments' => 'array', // Casting otomatis dari JSONB ke Array
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function platform()
    {
        return $this->belongsTo(Platform::class);
    }

    // Polymorphic relasi untuk Tag
    public function tags()
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
