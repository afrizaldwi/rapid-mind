<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicalCaseShare extends Model
{
    protected $guarded = ['id'];
    protected function casts(): array
    {
        return ['revoked_at' => 'datetime'];
    }
}
