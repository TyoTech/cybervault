<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasUuids;

    public const KIND_NOTE = 'note';
    public const KIND_WRITEUP = 'writeup';

    protected $fillable = [
        'user_id', 'category_id', 'title', 'slug', 'kind', 'content',
        'content_json', 'source', 'path_folder'
    ];

    protected $casts = [
        'content_json' => 'array',
    ];

    public function isWriteup(): bool
    {
        return $this->kind === self::KIND_WRITEUP;
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
    public function category() {
        return $this->belongsTo(Category::class);
    }
    public function tags() {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
