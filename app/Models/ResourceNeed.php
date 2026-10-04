<?php

namespace App\Models;

use App\Enums\ResourceCategory;
use Illuminate\Database\Eloquent\Model;

class ResourceNeed extends Model
{
    protected $fillable = [
        'shelter_id',
        'category',
        'material_name',
        'quantity_needed',
        'unit',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'category' => ResourceCategory::class,
            'quantity_needed' => 'decimal:2',
        ];
    }

    public function shelter()
    {
        return $this->belongsTo(Shelter::class);
    }

    public function allocations()
    {
        return $this->hasMany(ResourceAllocation::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
