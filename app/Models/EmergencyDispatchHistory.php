<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EmergencyDispatchEventType;
use App\Enums\EmergencyDispatchStatus;
use Database\Factories\EmergencyDispatchHistoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmergencyDispatchHistory extends Model
{
    /** @use HasFactory<EmergencyDispatchHistoryFactory> */
    use HasFactory;

    protected $table = 'emergency_dispatch_history';

    protected $fillable = [
        'emergency_dispatch_id', 'event_type', 'previous_status', 'status', 'changed_by', 'notes', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'event_type' => EmergencyDispatchEventType::class,
            'previous_status' => EmergencyDispatchStatus::class,
            'status' => EmergencyDispatchStatus::class,
            'metadata' => 'array',
        ];
    }

    public function dispatch(): BelongsTo
    {
        return $this->belongsTo(EmergencyDispatch::class, 'emergency_dispatch_id');
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
