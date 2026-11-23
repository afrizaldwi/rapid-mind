<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class RefreshTokenFamily extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'user_id', 'token_version', 'expires_at', 'revoked_at', 'revoked_reason'];

    protected function casts(): array
    {
        return [
            'token_version' => 'integer',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(RefreshToken::class, 'family_id');
    }
}
