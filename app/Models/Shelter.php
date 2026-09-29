<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Shelter extends Model {
    protected $fillable = ['region_id', 'name', 'address', 'location', 'is_active'];
    protected function casts(): array { return ['is_active' => 'boolean']; }
    public function region() { return $this->belongsTo(Region::class); }
    public function patients() { return $this->hasMany(Patient::class); }
    public function users() { return $this->hasMany(User::class); }
}
