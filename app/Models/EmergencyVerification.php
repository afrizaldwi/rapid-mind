<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class EmergencyVerification extends Model {
    protected $fillable = ['emergency_event_id', 'verified_by', 'method', 'clinical_result', 'notes'];
    protected function casts(): array {
        return [
            'method' => \App\Enums\VerificationMethod::class,
            'clinical_result' => \App\Enums\TriageCategory::class,
        ];
    }
    public function emergencyEvent() { return $this->belongsTo(EmergencyEvent::class); }
    public function verifier() { return $this->belongsTo(User::class, 'verified_by'); }
}
