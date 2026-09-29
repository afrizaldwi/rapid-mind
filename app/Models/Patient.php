<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class Patient extends Model {
    use HasUuids;
    protected $fillable = ['nik', 'name', 'age', 'gender', 'shelter_id', 'created_by'];
    public function shelter() { return $this->belongsTo(Shelter::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function assessments() { return $this->hasMany(Assessment::class); }
    public function emergencyEvents() { return $this->hasMany(EmergencyEvent::class); }
}
