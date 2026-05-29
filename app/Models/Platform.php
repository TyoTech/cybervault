<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Platform extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'slug', 'url', 'icon'];

    public function challenges()
    {
        return $this->hasMany(Challenge::class);
    }
}
