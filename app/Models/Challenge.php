<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Challenge extends Model
{
    protected $fillable = [
        'user_id',
        'lab',
        'kategori',
        'judul',
        'path_folder'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
