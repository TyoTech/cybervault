<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'category_id', 'title', 'slug', 'content', 'source', 'path_folder'
    ];

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
