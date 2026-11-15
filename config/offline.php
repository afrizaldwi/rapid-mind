<?php

return [
    // Requires APP_ENV=local, the localhost APP_URL and an authenticated Relawan.
    // HTTPS demo origins are exact opt-ins; this is not a production switch.
    'local_enrollment' => (bool) env('OFFLINE_ENCRYPTION_LOCAL_ENROLLMENT', false),
    'demo_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('OFFLINE_ENCRYPTION_DEMO_ORIGINS', ''))))),
];
