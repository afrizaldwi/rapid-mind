<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditLog extends Model {
    protected $fillable = ['actor_id', 'action', 'entity_type', 'entity_id', 'old_values', 'new_values'];
    protected function casts(): array {
        return [
            'old_values' => 'json',
            'new_values' => 'json',
        ];
    }
    public function actor() { return $this->belongsTo(User::class, 'actor_id'); }
}
