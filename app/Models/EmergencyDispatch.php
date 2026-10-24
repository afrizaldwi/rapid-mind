<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DispatchTargetSource;
use App\Enums\EmergencyDispatchStatus;
use Database\Factories\EmergencyDispatchFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmergencyDispatch extends Model
{
    /** @use HasFactory<EmergencyDispatchFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'emergency_event_id', 'referral_id', 'response_unit_id', 'assigned_by', 'assigned_at',
        'status', 'target_source', 'target_latitude', 'target_longitude', 'target_shelter_id',
        'target_description', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => EmergencyDispatchStatus::class,
            'target_source' => DispatchTargetSource::class,
            'assigned_at' => 'immutable_datetime',
            'target_latitude' => 'decimal:8',
            'target_longitude' => 'decimal:8',
        ];
    }

    public function emergencyEvent(): BelongsTo
    {
        return $this->belongsTo(EmergencyEvent::class);
    }

    public function referral(): BelongsTo
    {
        return $this->belongsTo(Referral::class);
    }

    public function responseUnit(): BelongsTo
    {
        return $this->belongsTo(ResponseUnit::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function targetShelter(): BelongsTo
    {
        return $this->belongsTo(Shelter::class, 'target_shelter_id');
    }

    public function history(): HasMany
    {
        return $this->hasMany(EmergencyDispatchHistory::class)->orderBy('created_at')->orderBy('id');
    }
}
