<?php

return [
    // Enrollment also requires APP_ENV=local, the exact localhost application
    // URL/Host and an active authenticated Relawan. Never a production switch.
    'local_enrollment' => (bool) env('OFFLINE_ENCRYPTION_LOCAL_ENROLLMENT', false),
];
