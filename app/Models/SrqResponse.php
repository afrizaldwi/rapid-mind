<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SrqResponse extends Model {
    protected $fillable = ['assessment_id', 'question_number', 'answer', 'answer_state'];
    protected function casts(): array { return ['answer' => 'boolean']; }
    public function responseValue(): bool|string
    {
        return $this->answer_state ?? $this->answer ?? 'UNANSWERED';
    }
    public function assessment() { return $this->belongsTo(Assessment::class); }
}
