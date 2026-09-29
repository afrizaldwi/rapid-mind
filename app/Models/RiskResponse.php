<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RiskResponse extends Model {
    protected $fillable = ['assessment_id', 'indicator', 'answer', 'weight'];
    protected function casts(): array { return ['answer' => 'boolean', 'weight' => 'integer']; }
    public function assessment() { return $this->belongsTo(Assessment::class); }
}
