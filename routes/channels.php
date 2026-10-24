<?php

use App\Enums\UserRole;
use App\Models\HealthcareFacility;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, $id) {
    $current = $user->fresh();

    return $current?->is_active === true && (string) $current->id === (string) $id;
});

Broadcast::channel('healthcare.facility.{facilityId}', function (User $user, $facilityId) {
    $current = $user->fresh();
    $requestedFacility = filter_var($facilityId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

    return $current?->is_active === true
        && $current->role === UserRole::HEALTHCARE
        && $current->facility_id !== null
        && $requestedFacility !== false
        && (int) $current->facility_id === $requestedFacility
        && HealthcareFacility::whereKey($requestedFacility)->where('is_active', true)->exists();
});

Broadcast::channel('emergencies', function (User $user) {
    $current = $user->fresh();

    return $current?->is_active === true && $current->role === UserRole::HEALTHCARE;
});
