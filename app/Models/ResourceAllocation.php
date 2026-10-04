<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResourceAllocation extends Model
{
    protected $fillable = ['resource_need_id', 'quantity_allocated', 'allocated_by'];

    protected function casts(): array
    {
        return ['quantity_allocated' => 'decimal:2'];
    }

    public function resourceNeed()
    {
        return $this->belongsTo(ResourceNeed::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }
}
