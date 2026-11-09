<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Database\Eloquent\Model;

/** Resolve recipients at send time; old subscriptions never retain case grants. */
final class CaseAudience
{
    public static function channel(User $user): string
    {
        return "healthcare.facility.{$user->facility_id}.user.{$user->id}.version.{$user->token_version}";
    }

    public static function forCase(?Model $case): array
    {
        if (!$case) return [];
        return User::where('role', UserRole::HEALTHCARE)->where('is_active', true)->whereNotNull('facility_id')
            ->whereHas('facility', fn($facility) => $facility->where('is_active', true))->get()
            ->filter(fn($user) => HealthcareCaseAccess::cases($case->newQuery(), $user)->whereKey($case->id)->exists())
            ->map(fn($user) => new PrivateChannel(self::channel($user)))->values()->all();
    }
}
