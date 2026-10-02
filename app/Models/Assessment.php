<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class Assessment extends Model {
    use HasUuids;
    protected $fillable = ['patient_id', 'user_id', 'status', 'mode', 'started_at', 'completed_at'];
    protected function casts(): array {
        return [
            'status' => \App\Enums\AssessmentStatus::class,
            'mode' => \App\Enums\AssessmentMode::class,
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
    public function patient() { return $this->belongsTo(Patient::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function srqResponses() { return $this->hasMany(SrqResponse::class); }
    public function riskAssessment() { return $this->hasMany(RiskResponse::class); }
    public function functionAssessment() { return $this->hasMany(FunctionResponse::class); }
    public function triageResult() { return $this->hasOne(TriageResult::class); }
    public function clinicalValidation() { return $this->hasOne(ClinicalValidation::class); }
}
