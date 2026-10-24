<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
class Referral extends Model {
    use HasFactory, HasUuids;
    protected $fillable = ['emergency_event_id', 'emergency_verification_id', 'clinical_validation_id', 'patient_id', 'referred_by', 'facility_id', 'status', 'notes'];
    protected function casts(): array {
        return [
            'status' => \App\Enums\ReferralStatus::class,
        ];
    }
    public function emergencyEvent() { return $this->belongsTo(EmergencyEvent::class); }
    public function emergencyVerification() { return $this->belongsTo(EmergencyVerification::class); }
    public function dispatch() { return $this->hasOne(EmergencyDispatch::class); }
    public function clinicalValidation() { return $this->belongsTo(ClinicalValidation::class); }
    public function patient() { return $this->belongsTo(Patient::class); }
    public function referrer() { return $this->belongsTo(User::class, 'referred_by'); }
    public function facility() { return $this->belongsTo(HealthcareFacility::class); }
    public function statusHistory() { return $this->hasMany(ReferralStatusHistory::class); }
}
