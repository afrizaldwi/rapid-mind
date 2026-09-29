<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SrqResponse extends Model {
    protected $fillable = ['assessment_id', 'question_number', 'answer'];
    protected function casts(): array { return ['answer' => 'boolean']; }
    public function assessment() { return $this->belongsTo(Assessment::class); }
}
