<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ClinicalValidation extends Model {
    protected $fillable = ['assessment_id', 'validated_by', 'clinical_result', 'diagnosis_notes', 'intervention_plan', 'referral_required'];
    protected function casts(): array {
        return [
            'clinical_result' => \App\Enums\TriageCategory::class,
            'referral_required' => 'boolean',
        ];
    }
    public function assessment() { return $this->belongsTo(Assessment::class); }
    public function validator() { return $this->belongsTo(User::class, 'validated_by'); }
}
