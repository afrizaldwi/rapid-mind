<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Healthcare\HealthcareController;
use App\Http\Controllers\Relawan\RelawanController;
use Illuminate\Support\Facades\Route;

// Public & Auth Routes
Route::get('/', [AuthController::class, 'showLogin'])->name('home');
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// ──────────────────────────────────────────────
// ROLE 1: RELAWAN (Mobile PWA)
// ──────────────────────────────────────────────
Route::middleware(['auth.jwt', 'role:RELAWAN'])->prefix('relawan')->name('relawan.')->group(function () {
    Route::get('/home', [RelawanController::class, 'home'])->name('home');
    Route::get('/pfa', [RelawanController::class, 'pfa'])->name('pfa');

    // Assessment flow
    Route::get('/assessment', [RelawanController::class, 'assessmentIndex'])->name('assessment.index');
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

    // Data & Local Sync Workspace
    Route::get('/data', [RelawanController::class, 'data'])->name('data');

    // T0 Emergency Incident
    Route::post('/emergencies', [RelawanController::class, 'triggerEmergency'])->name('emergencies.trigger');
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

    // Clinical Validations
    Route::get('/validations', [HealthcareController::class, 'validations'])->name('validations.index');
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
    Route::post('/volunteers/{userId}/assign', [AdminController::class, 'assignVolunteer'])->name('volunteers.assign');
    Route::get('/logistics', [AdminController::class, 'logistics'])->name('logistics');
    Route::get('/facilities', [AdminController::class, 'facilities'])->name('facilities');
    Route::get('/accounts', [AdminController::class, 'accounts'])->name('accounts.index');
    Route::post('/accounts', [AdminController::class, 'createAccount'])->name('accounts.store');
});
