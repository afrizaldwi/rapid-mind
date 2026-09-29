<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role', 'token_version', 'is_active', 'facility_id', 'shelter_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => \App\Enums\UserRole::class,
            'is_active' => 'boolean',
            'token_version' => 'integer',
        ];
    }

    public function facility()
    {
        return $this->belongsTo(HealthcareFacility::class);
    }

    public function shelter()
    {
        return $this->belongsTo(Shelter::class);
    }

    public function assessments()
    {
        return $this->hasMany(Assessment::class);
    }

    public function emergencyEvents()
    {
        return $this->hasMany(EmergencyEvent::class);
    }
}
