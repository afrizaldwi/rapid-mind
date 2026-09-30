<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ReferralStatusHistory extends Model {
    protected $table = 'referral_status_history';
    protected $fillable = ['referral_id', 'status', 'changed_by', 'notes'];
    protected function casts(): array {
        return [
            'status' => \App\Enums\ReferralStatus::class,
        ];
    }
    public function referral() { return $this->belongsTo(Referral::class); }
    public function changer() { return $this->belongsTo(User::class, 'changed_by'); }
}
