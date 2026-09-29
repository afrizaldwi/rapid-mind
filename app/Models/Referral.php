<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class Referral extends Model {
    use HasUuids;
    protected $fillable = ['emergency_event_id', 'patient_id', 'referred_by', 'facility_id', 'status', 'notes'];
    protected function casts(): array {
        return [
            'status' => \App\Enums\ReferralStatus::class,
        ];
    }
    public function emergencyEvent() { return $this->belongsTo(EmergencyEvent::class); }
    public function patient() { return $this->belongsTo(Patient::class); }
    public function referrer() { return $this->belongsTo(User::class, 'referred_by'); }
    public function facility() { return $this->belongsTo(HealthcareFacility::class); }
    public function statusHistory() { return $this->hasMany(ReferralStatusHistory::class); }
}
