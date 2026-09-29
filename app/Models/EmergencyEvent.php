<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class EmergencyEvent extends Model {
    use HasUuids;
    protected $fillable = ['patient_id', 'assessment_id', 'user_id', 'red_flag_type', 'status', 'latitude', 'longitude', 'shelter_id', 'notes'];
    protected function casts(): array {
        return [
            'red_flag_type' => \App\Enums\RedFlagType::class,
            'status' => \App\Enums\EmergencyStatus::class,
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }
    public function patient() { return $this->belongsTo(Patient::class); }
    public function assessment() { return $this->belongsTo(Assessment::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function shelter() { return $this->belongsTo(Shelter::class); }
    public function verifications() { return $this->hasMany(EmergencyVerification::class); }
    public function referrals() { return $this->hasMany(Referral::class); }
}
