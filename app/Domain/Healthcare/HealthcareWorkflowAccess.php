<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

final class HealthcareWorkflowAccess
{
    public static function authorize(User $actor): void
    {
        $current = $actor->fresh();
        if (! $current || ! $current->is_active || $current->role !== UserRole::HEALTHCARE) {
            throw new AuthorizationException('Anda tidak memiliki akses untuk menjalankan tindakan Healthcare.');
        }
    }
}
