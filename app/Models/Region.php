<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Region extends Model {
    protected $fillable = ['name', 'geometry'];
    public function shelters() { return $this->hasMany(Shelter::class); }
}
