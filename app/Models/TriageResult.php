<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TriageResult extends Model {
    protected $fillable = ['assessment_id', 'srq_score', 'risk_score', 'function_score', 'total_score', 'system_recommendation', 'is_red_flag_override', 'red_flag_source'];
    protected function casts(): array {
        return [
            'srq_score' => 'integer',
            'risk_score' => 'integer',
            'function_score' => 'integer',
            'total_score' => 'integer',
            'system_recommendation' => \App\Enums\TriageCategory::class,
            'is_red_flag_override' => 'boolean',
        ];
    }
    public function assessment() { return $this->belongsTo(Assessment::class); }
}
