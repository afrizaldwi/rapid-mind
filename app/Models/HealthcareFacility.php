<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class HealthcareFacility extends Model {
    protected $fillable = ['name', 'type', 'address', 'is_active'];
    protected function casts(): array { return ['is_active' => 'boolean']; }
    public function users() { return $this->hasMany(User::class, 'facility_id'); }
}
