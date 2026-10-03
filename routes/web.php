<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\FacilityManagementController;
use App\Http\Controllers\Admin\ProvisioningController;
use App\Http\Controllers\Admin\ShelterManagementController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Healthcare\HealthcareController;
use App\Http\Controllers\Relawan\RelawanController;
use App\Http\Controllers\Relawan\RelawanSessionController;
use App\Http\Controllers\Relawan\RelawanSyncController;
use Illuminate\Support\Facades\Route;

// Public & Auth Routes
Route::get('/', [AuthController::class, 'showLogin'])->name('home');
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Read-only recovery boundary for the static offline Relawan runtime.
Route::get('/relawan/session-status', [RelawanSessionController::class, 'status'])
    ->name('relawan.session-status');

// ──────────────────────────────────────────────
// ROLE 1: RELAWAN (Mobile PWA)
// ──────────────────────────────────────────────
Route::middleware(['auth.jwt', 'role:RELAWAN'])->prefix('relawan')->name('relawan.')->group(function () {
    Route::get('/home', [RelawanController::class, 'home'])->name('home');
    Route::get('/pfa', [RelawanController::class, 'pfa'])->name('pfa');
    Route::get('/patients/options', [RelawanController::class, 'patientOptions'])->name('patients.options');

    // Assessment flow
    Route::get('/assessment', [RelawanController::class, 'assessmentIndex'])->name('assessment.index');
    Route::get('/assessment/drafts', [RelawanController::class, 'assessmentDrafts'])->name('assessment.drafts');
    Route::post('/assessment', [RelawanController::class, 'createAssessment'])->name('assessment.create');
    Route::get('/assessment/{assessmentId}/identity', [RelawanController::class, 'assessmentIdentity'])->name('assessment.identity');
    Route::get('/assessment/{assessmentId}/srq', [RelawanController::class, 'assessmentSrq'])->name('assessment.srq');
    Route::post('/assessment/{assessmentId}/srq', [RelawanController::class, 'saveSrq'])->name('assessment.srq.save');
    Route::get('/assessment/{assessmentId}/risk', [RelawanController::class, 'assessmentRisk'])->name('assessment.risk');
    Route::post('/assessment/{assessmentId}/risk', [RelawanController::class, 'saveRisk'])->name('assessment.risk.save');
    Route::get('/assessment/{assessmentId}/function', [RelawanController::class, 'assessmentFunction'])->name('assessment.function');
    Route::post('/assessment/{assessmentId}/function', [RelawanController::class, 'saveFunction'])->name('assessment.function.save');
    Route::get('/assessment/{assessmentId}/review', [RelawanController::class, 'assessmentReview'])->name('assessment.review');
    Route::post('/assessment/{assessmentId}/complete', [RelawanController::class, 'completeAssessment'])->name('assessment.complete');
    Route::get('/assessment/{assessmentId}/result', [RelawanController::class, 'assessmentResult'])->name('assessment.result');

    Route::post('/sync/assessments', [RelawanSyncController::class, 'assessment'])->name('sync.assessments');
    Route::post('/sync/emergencies', [RelawanSyncController::class, 'emergency'])->name('sync.emergencies');

    // Data & Local Sync Workspace
    Route::get('/data', [RelawanController::class, 'data'])->name('data');

    // T0 Emergency Incident
    Route::post('/emergencies', [RelawanController::class, 'triggerEmergency'])->name('emergencies.trigger');
    Route::get('/emergencies/{emergencyId}/status', [RelawanController::class, 'emergencyStatus'])->name('emergencies.status');
    Route::get('/emergencies/{emergencyId}', [RelawanController::class, 'emergencyDetail'])->name('emergencies.show');
});

// ──────────────────────────────────────────────
// ROLE 2: HEALTHCARE / FASKES / PSC 119 (Desktop)
// ──────────────────────────────────────────────
Route::middleware(['auth.jwt', 'role:HEALTHCARE'])->prefix('healthcare')->name('healthcare.')->group(function () {
    Route::get('/emergencies', [HealthcareController::class, 'emergencies'])->name('emergencies.index');
    Route::get('/emergencies/{emergencyId}', [HealthcareController::class, 'emergencyDetail'])->name('emergencies.show');
    Route::post('/emergencies/{emergencyId}/acknowledge', [HealthcareController::class, 'acknowledge'])->name('emergencies.acknowledge');
    Route::post('/emergencies/{emergencyId}/verify', [HealthcareController::class, 'verify'])->name('emergencies.verify');
    Route::post('/emergencies/{emergencyId}/classify', [HealthcareController::class, 'classify'])->name('emergencies.classify');
    Route::post('/emergencies/{emergencyId}/referrals', [HealthcareController::class, 'createEmergencyReferral'])->name('emergencies.referrals.store');

    // Clinical Validations
    Route::get('/validations', [HealthcareController::class, 'validations'])->name('validations.index');
    Route::get('/validations/{assessmentId}', [HealthcareController::class, 'validationDetail'])->name('validations.show');
    Route::post('/validations/{assessmentId}', [HealthcareController::class, 'validateAssessment'])->name('validations.store');

    // Referrals & Dispatch Tracking
    Route::get('/referrals', [HealthcareController::class, 'referrals'])->name('referrals.index');
    Route::post('/referrals/{referralId}/status', [HealthcareController::class, 'updateReferralStatus'])->name('referrals.status');

    // Patient Records
    Route::get('/patients', [HealthcareController::class, 'patients'])->name('patients.index');
    Route::get('/patients/{patientId}', [HealthcareController::class, 'patientDetail'])->name('patients.show');
});

// ──────────────────────────────────────────────
// ROLE 3: ADMIN BPBD / DINKES (Desktop Command Center)
// ──────────────────────────────────────────────
Route::middleware(['auth.jwt', 'role:ADMIN'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/summary', [AdminController::class, 'summary'])->name('summary');
    Route::get('/map', [AdminController::class, 'map'])->name('map');
    Route::get('/analytics', [AdminController::class, 'analytics'])->name('analytics');
    Route::get('/volunteers', [AdminController::class, 'volunteers'])->name('volunteers');
    Route::get('/volunteers/create', [ProvisioningController::class, 'createVolunteer'])->name('volunteers.create');
    Route::post('/volunteers', [ProvisioningController::class, 'storeVolunteer'])->name('volunteers.store');
    Route::get('/volunteers/{userId}', [ProvisioningController::class, 'showVolunteer'])->name('volunteers.show');
    Route::put('/volunteers/{userId}', [ProvisioningController::class, 'updateVolunteer'])->name('volunteers.update');
    Route::get('/logistics', [AdminController::class, 'logistics'])->name('logistics');
    Route::get('/facilities', fn() => redirect('/admin/facilities/organizations'))->name('facilities');
    Route::get('/operations/posko', [ShelterManagementController::class, 'index'])->name('posko.index');
    Route::get('/operations/posko/create', [ShelterManagementController::class, 'create'])->name('posko.create');
    Route::post('/operations/posko', [ShelterManagementController::class, 'store'])->name('posko.store');
    Route::get('/operations/posko/{shelter}', [ShelterManagementController::class, 'show'])->name('posko.show');
    Route::put('/operations/posko/{shelter}', [ShelterManagementController::class, 'update'])->name('posko.update');
    Route::get('/facilities/organizations', [FacilityManagementController::class, 'index'])->name('organizations.index');
    Route::get('/facilities/organizations/create', [FacilityManagementController::class, 'create'])->name('organizations.create');
    Route::post('/facilities/organizations', [FacilityManagementController::class, 'store'])->name('organizations.store');
    Route::get('/facilities/organizations/{facility}', [FacilityManagementController::class, 'show'])->name('organizations.show');
    Route::put('/facilities/organizations/{facility}', [FacilityManagementController::class, 'update'])->name('organizations.update');
    Route::get('/facilities/users', [ProvisioningController::class, 'healthcareUsers'])->name('healthcare-users.index');
    Route::get('/facilities/users/create', [ProvisioningController::class, 'createHealthcare'])->name('healthcare-users.create');
    Route::post('/facilities/users', [ProvisioningController::class, 'storeHealthcare'])->name('healthcare-users.store');
    Route::get('/facilities/users/{userId}', [ProvisioningController::class, 'showHealthcare'])->name('healthcare-users.show');
    Route::put('/facilities/users/{userId}', [ProvisioningController::class, 'updateHealthcare'])->name('healthcare-users.update');
});
