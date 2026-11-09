<?php

namespace Tests\Feature;

use App\Domain\Healthcare\CaseAudience;
use App\Domain\Healthcare\CaseSharing;
use App\Models\AuditLog;
use App\Models\ClinicalCaseShare;
use App\Models\ClinicalValidation;
use App\Models\EmergencyEvent;
use App\Models\EmergencyVerification;
use App\Models\Referral;
use App\Models\ResponseUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class HealthcareCaseScopeTest extends TestCase
{
    use RefreshDatabase, \Tests\Concerns\ClinicalScopeFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        Event::fake([
            \App\Events\EmergencyCreated::class,
            \App\Events\EmergencyUpdated::class,
            \App\Events\ReferralUpdated::class,
            \App\Events\DispatchUpdated::class,
            \App\Events\AssessmentUpdated::class
        ]);
        $this->createScopeFixtures();
    }

    public function test_routing_snapshots_posko_facility_without_identity_and_never_transfers_old_cases(): void
    {
        $case = $this->scopeEmergency('A');
        $this->assertNull($case->patient_id);
        $this->assertSame($this->facilities['A']->id, $case->responsible_facility_id);
        $this->assertSame($this->posko['A']->id, $case->originating_shelter_id);
        $this->relawan['A']->update(['shelter_id' => $this->posko['B']->id]);
        $this->assertSame($this->facilities['A']->id, $case->fresh()->responsible_facility_id);
        $this->assertSame($this->facilities['B']->id, $this->scopeEmergency('A')->responsible_facility_id);
        $this->facilities['B']->update(['is_active' => false]);
        $unresolved = $this->scopeEmergency('A');
        $this->assertNull($unresolved->responsible_facility_id);
        $this->assertSame('UNRESOLVED', $unresolved->routing_status);
        $this->assertSame([], CaseAudience::forCase($unresolved));
        $this->posko['A']->update(['primary_facility_id' => $this->facilities['B']->id]);
        $this->assertSame($this->facilities['A']->id, $case->fresh()->responsible_facility_id);
    }

    public function test_lists_counts_direct_ids_and_nested_history_are_scoped_to_cases(): void
    {
        $patient = $this->scopePatient();
        $a = $this->scopeAssessment('A', $patient);
        $b = $this->scopeAssessment('B', $patient);
        $ea = $this->scopeEmergency('A', $patient, $a);
        $eb = $this->scopeEmergency('B', $patient, $b);
        $this->actingAs($this->medics['A']);
        $this->get('/healthcare/emergencies')->assertInertia(fn(Assert $page) => $page
            ->has('emergencies', 1)->where('emergencies.0.id', $ea->id)->where('pendingT0Count', 1)->etc());
        $this->get('/healthcare/validations')->assertInertia(fn(Assert $page) => $page
            ->has('pendingAssessments', 1)->where('pendingAssessments.0.id', $a->id)->etc());
        $this->get("/healthcare/patients/$patient->id")->assertInertia(fn(Assert $page) => $page
            ->has('patient.assessments', 1)->where('patient.assessments.0.id', $a->id)
            ->has('patient.emergency_events', 1)->where('patient.emergency_events.0.id', $ea->id)->etc());
        $this->get("/healthcare/validations/$b->id")->assertNotFound();
        $this->get("/healthcare/emergencies/$eb->id")->assertNotFound();
        $this->postJson("/healthcare/emergencies/$eb->id/acknowledge")->assertNotFound();
        $this->postJson("/healthcare/validations/$b->id", ['clinical_result' => 'T3'])->assertNotFound();
        $this->postJson("/healthcare/emergencies/$ea->id/acknowledge")->assertOk();
        $this->actingAs($this->medics['B'])->get("/healthcare/emergencies/$ea->id")->assertNotFound();
        foreach (['ADMIN', 'RELAWAN'] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role, 'is_active' => true]))
                ->getJson("/healthcare/emergencies/$ea->id")->assertForbidden();
        }
    }

    public function test_patient_summary_is_reciprocally_scoped_for_all_clinical_sources(): void
    {
        $patient = $this->scopePatient();
        $assessments = [];
        foreach (['A' => 'T1', 'B' => 'T2'] as $key => $category) {
            $assessments[$key] = $this->scopeAssessment($key, $patient);
            $assessments[$key]->update(['completed_at' => now()->subHours($key === 'A' ? 2 : 1)]);
            $assessments[$key]->triageResult()->update(['system_recommendation' => $category]);
        }
        $this->assertScopedPatientSummary($patient, [
            'A' => ['T1', 'system_recommendation'], 'B' => ['T2', 'system_recommendation'],
        ]);

        foreach (['A' => 'T3', 'B' => 'T1'] as $key => $category) {
            $validation = ClinicalValidation::create([
                'assessment_id' => $assessments[$key]->id,
                'validated_by' => $this->medics[$key]->id,
                'clinical_result' => $category,
            ]);
            $validation->forceFill(['created_at' => now()->subMinutes($key === 'A' ? 40 : 30)])->save();
        }
        $this->assertScopedPatientSummary($patient, [
            'A' => ['T3', 'assessment_validation'], 'B' => ['T1', 'assessment_validation'],
        ]);

        $emergencies = [];
        foreach (['A' => 'T2', 'B' => 'T3'] as $key => $category) {
            $emergencies[$key] = $this->scopeEmergency($key, $patient, $assessments[$key]);
            $emergencies[$key]->update(['status' => 'DOWNGRADED']);
            $verification = EmergencyVerification::create([
                'emergency_event_id' => $emergencies[$key]->id,
                'verified_by' => $this->medics[$key]->id,
                'method' => 'PHONE',
                'clinical_result' => $category,
            ]);
            $verification->forceFill(['created_at' => now()->subMinutes($key === 'A' ? 20 : 10)])->save();
        }
        $this->assertScopedPatientSummary($patient, [
            'A' => ['T2', 'emergency_decision'], 'B' => ['T3', 'emergency_decision'],
        ]);

        $emergencies['A']->update(['status' => 'PENDING']);
        $emergencies['B']->update(['status' => 'CONFIRMED']);
        $this->assertScopedPatientSummary($patient, [
            'A' => ['T0_SUSPECT', 'active_emergency'], 'B' => ['T0_CONFIRMED', 'active_emergency'],
        ]);
    }

    private function assertScopedPatientSummary(\App\Models\Patient $patient, array $expected): void
    {
        foreach ($expected as $key => [$category, $source]) {
            $this->actingAs($this->medics[$key])->get('/healthcare/patients')
                ->assertOk()->assertInertia(fn(Assert $page) => $page
                    ->has('patients', 1)->where('patients.0.id', $patient->id)
                    ->has('patients.0.assessments', 1)
                    ->where('patients.0.assessments.0.responsible_facility_id', $this->facilities[$key]->id)
                    ->where('patients.0.latest_clinical_status.category', $category)
                    ->where('patients.0.latest_clinical_status.source', $source)->etc());
        }
    }

    public function test_referral_grants_only_explicit_related_case_reads_and_revocation_removes_future_audiences(): void
    {
        $patient = $this->scopePatient();
        $assessment = $this->scopeAssessment('A', $patient);
        $unrelated = $this->scopeAssessment('A', $patient);
        $emergency = $this->scopeEmergency('A', $patient, $assessment);
        $otherEmergency = $this->scopeEmergency('A', $patient, $unrelated);
        $this->actingAs($this->medics['A']);
        $this->postJson("/healthcare/emergencies/$emergency->id/acknowledge")->assertOk();
        $this->postJson("/healthcare/emergencies/$emergency->id/verify", ['method' => 'PHONE'])->assertOk();
        $this->postJson("/healthcare/emergencies/$emergency->id/classify", ['clinical_result' => 'T0_CONFIRMED'])->assertOk();
        $this->postJson("/healthcare/emergencies/$emergency->id/referrals", ['facility_id' => $this->facilities['B']->id])->assertOk();
        $referral = Referral::sole();
        $unit = ResponseUnit::factory()->create();
        $this->postJson("/healthcare/emergencies/$emergency->id/dispatches", ['response_unit_id' => $unit->id])->assertOk();
        $dispatch = $emergency->dispatch()->firstOrFail();
        $this->assertSame(2, ClinicalCaseShare::count());
        $this->assertSame(2, AuditLog::where('action', 'CLINICAL_CASE_SHARED')->count());
        $this->actingAs($this->medics['B']);
        $this->get("/healthcare/emergencies/$emergency->id")->assertInertia(fn(Assert $page) => $page->where('emergency.can_manage', false)->etc());
        $this->get("/healthcare/validations/$assessment->id")->assertOk();
        $this->get("/healthcare/validations/$unrelated->id")->assertNotFound();
        $this->get("/healthcare/emergencies/$otherEmergency->id")->assertNotFound();
        $this->get("/healthcare/patients/$patient->id")->assertInertia(fn(Assert $page) => $page
            ->has('patient.assessments', 1)->has('patient.emergency_events', 1)->has('patient.referrals', 1)->etc());
        foreach (
            [
                'acknowledge' => [],
                'verify' => ['method' => 'PHONE'],
                'classify' => ['clinical_result' => 'T3'],
                'referrals' => ['facility_id' => $this->facilities['B']->id],
                'dispatches' => ['response_unit_id' => $unit->id]
            ] as $step => $data
        ) {
            $this->postJson("/healthcare/emergencies/$emergency->id/$step", $data)->assertNotFound();
        }
        $this->postJson("/healthcare/validations/$assessment->id", ['clinical_result' => 'T3'])->assertNotFound();
        $this->postJson("/healthcare/referrals/$referral->id/complete", ['expected_status' => 'ACTIVE'])->assertNotFound();
        $this->postJson("/healthcare/referrals/$referral->id/status", ['expected_status' => 'ACTIVE', 'status' => 'COMPLETED'])->assertNotFound();
        $this->postJson("/healthcare/dispatches/$dispatch->id/status", ['expected_status' => 'ASSIGNED', 'status' => 'EN_ROUTE'])->assertNotFound();
        $this->postJson("/healthcare/dispatches/$dispatch->id/referral", ['expected_referral_id' => null, 'referral_id' => $referral->id])->assertNotFound();
        $channels = array_column(CaseAudience::forCase($emergency), 'name');
        $this->assertContains('private-' . CaseAudience::channel($this->medics['B']->fresh()), $channels);
        CaseSharing::revokeReferral($referral, $this->medics['A']);
        $this->get("/healthcare/emergencies/$emergency->id")->assertNotFound();
        $this->assertNotContains('private-' . CaseAudience::channel($this->medics['B']->fresh()), array_column(CaseAudience::forCase($emergency), 'name'));
        $this->assertSame(2, AuditLog::where('action', 'CLINICAL_CASE_SHARE_REVOKED')->count());
        $this->actingAs($this->medics['A'])->get("/healthcare/emergencies/$emergency->id")->assertOk();
    }

    public function test_inactive_and_reassigned_accounts_facilities_and_unresolved_history_fail_closed(): void
    {
        $case = $this->scopeEmergency('A', $this->scopePatient());
        $channel = 'private-' . CaseAudience::channel($this->medics['A']->fresh());
        $this->medics['A']->update(['facility_id' => $this->facilities['B']->id]);
        $this->actingAs($this->medics['A'])->get("/healthcare/emergencies/$case->id")->assertNotFound();
        $this->assertNotContains($channel, array_column(CaseAudience::forCase($case), 'name'));
        $this->medics['A']->update(['facility_id' => $this->facilities['A']->id]);
        $this->facilities['A']->update(['is_active' => false]);
        $this->get("/healthcare/emergencies/$case->id")->assertNotFound();
        $this->assertSame([], CaseAudience::forCase($case));
        $this->facilities['A']->update(['is_active' => true]);
        $case->forceFill(['responsible_facility_id' => null, 'routing_status' => 'UNRESOLVED'])->save();
        $this->get("/healthcare/emergencies/$case->id")->assertNotFound();
        $this->assertSame([], CaseAudience::forCase($case));
        $this->assertSame('UNRESOLVED', $case->fresh()->routing_status);
    }

    public function test_only_admin_can_change_posko_primary_facility_and_existing_cases_do_not_move(): void
    {
        $case = $this->scopeEmergency('A');
        $posko = $this->posko['A'];
        $data = [
            'name' => $posko->name,
            'region_id' => $posko->region_id,
            'is_active' => true,
            'primary_facility_id' => $this->facilities['B']->id
        ];
        $this->actingAs($this->medics['A'])->putJson("/admin/operations/posko/$posko->id", $data)->assertForbidden();
        $admin = User::factory()->create(['role' => 'ADMIN', 'is_active' => true]);
        $this->actingAs($admin)->put("/admin/operations/posko/$posko->id", $data)->assertSessionHasNoErrors();
        $this->assertSame($this->facilities['B']->id, $posko->fresh()->primary_facility_id);
        $this->assertSame($this->facilities['A']->id, $case->fresh()->responsible_facility_id);
        $this->assertSame($this->facilities['B']->id, $this->scopeEmergency('A')->responsible_facility_id);
        $this->assertSame(1, AuditLog::where('action', 'SHELTER_PRIMARY_FACILITY_CHANGED')->count());
        $this->facilities['B']->update(['is_active' => false]);
        $this->putJson("/admin/operations/posko/$posko->id", $data)->assertUnprocessable()->assertJsonValidationErrors('primary_facility_id');
        $data['primary_facility_id'] = null;
        $this->put("/admin/operations/posko/$posko->id", $data)->assertSessionHasNoErrors();
        $this->assertSame('UNRESOLVED', $this->scopeEmergency('A')->routing_status);
    }
}
