<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('healthcare.facility.{facilityId}', function ($user, $facilityId) {
    $role = $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string) $user->role;
    return in_array(strtoupper($role), ['HEALTHCARE', 'ADMIN'], true);
});

Broadcast::channel('emergencies', function ($user) {
    $role = $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string) $user->role;
    return in_array(strtoupper($role), ['HEALTHCARE', 'ADMIN'], true);
});
