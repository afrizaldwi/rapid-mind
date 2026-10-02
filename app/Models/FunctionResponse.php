<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FunctionResponse extends Model {
    protected $fillable = ['assessment_id', 'domain', 'level'];
    protected function casts(): array { return ['level' => 'integer']; }
    public function assessment() { return $this->belongsTo(Assessment::class); }
}
