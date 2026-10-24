<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ResponseUnitFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResponseUnit extends Model
{
    /** @use HasFactory<ResponseUnitFactory> */
    use HasFactory;

    protected $fillable = ['code', 'name', 'facility_id', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(HealthcareFacility::class);
    }

    public function dispatches(): HasMany
    {
        return $this->hasMany(EmergencyDispatch::class);
    }
}
