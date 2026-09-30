<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Region;
use App\Models\Shelter;
use App\Models\TriageResult;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DemoSeederRepeatabilityTest extends TestCase
{
    use RefreshDatabase;

    private function tableIds(string $table): array
    {
        return DB::table($table)->orderBy('id')->pluck('id')->all();
    }

    public function test_demo_seeder_can_run_twice_without_duplicating_or_redirecting_demo_data(): void
    {
        $otherRegion = Region::create(['name' => 'Wilayah Lain']);
        $otherShelter = Shelter::create([
            'region_id' => $otherRegion->id,
            'name' => 'Posko Candi',
            'address' => 'Alamat Lain',
        ]);
        $otherFacility = HealthcareFacility::create([
            'name' => 'RSUD Candi',
            'type' => 'Rumah Sakit Rujukan',
            'address' => 'Alamat Lain',
        ]);
        $otherUser = User::factory()->create([
            'role' => UserRole::RELAWAN,
            'shelter_id' => $otherShelter->id,
        ]);
        $otherPatient = Patient::create([
            'nik' => '9999999999999999',
            'name' => 'Siti Aminah',
            'created_by' => $otherUser->id,
            'shelter_id' => $otherShelter->id,
        ]);

        $this->seed(DemoSeeder::class);

        $region = Region::where('name', 'Kawasan Bencana Merapi - DIY')->firstOrFail();
        $candi = Shelter::where('region_id', $region->id)->where('name', 'Posko Candi')->firstOrFail();
        $pakem = Shelter::where('region_id', $region->id)->where('name', 'Posko Siaga Pakem')->firstOrFail();
        $rsud = HealthcareFacility::where('name', 'RSUD Candi')->where('address', 'Jl. Kaliurang Km 12, Sleman')->firstOrFail();
        $relawan = User::where('email', 'relawan@rapidmind.id')->firstOrFail();
        $healthcare = User::where('email', 'nakes@rapidmind.id')->firstOrFail();
        $siti = Patient::where('nik', '3404010101850001')->firstOrFail();
        $bambang = Patient::where('nik', '3404010202780002')->firstOrFail();
        $dewi = Patient::where('nik', '3404010303950003')->firstOrFail();
        $assessment = Assessment::where('patient_id', $siti->id)->firstOrFail();
        $emergency = EmergencyEvent::where('patient_id', $bambang->id)->firstOrFail();

        $tables = [
            'regions', 'shelters', 'healthcare_facilities', 'users', 'patients',
            'assessments', 'srq_responses', 'risk_responses', 'function_responses',
            'triage_results', 'emergency_events',
        ];
        $idsBefore = [];
        foreach ($tables as $table) {
            $idsBefore[$table] = $this->tableIds($table);
        }

        // Rerunning seed data must not overwrite subsequent clinical or demographic edits.
        $emergency->update(['status' => EmergencyStatus::ACKNOWLEDGED]);
        $siti->update(['name' => 'Nama Siti Diperbarui']);
        $this->seed(DemoSeeder::class);

        foreach ($tables as $table) {
            $this->assertSame($idsBefore[$table], $this->tableIds($table), $table.' IDs changed after reseeding.');
        }

        $this->assertSame($region->id, $candi->fresh()->region_id);
        $this->assertSame($region->id, $pakem->fresh()->region_id);
        $this->assertSame($candi->id, $relawan->fresh()->shelter_id);
        $this->assertSame($rsud->id, $healthcare->fresh()->facility_id);
        $this->assertSame($candi->id, $siti->fresh()->shelter_id);
        $this->assertSame($candi->id, $bambang->fresh()->shelter_id);
        $this->assertSame($pakem->id, $dewi->fresh()->shelter_id);
        foreach ([$siti, $bambang, $dewi] as $patient) {
            $this->assertSame($relawan->id, $patient->fresh()->created_by);
        }
        $this->assertSame($siti->id, $assessment->fresh()->patient_id);
        $this->assertSame($relawan->id, $assessment->fresh()->user_id);
        $this->assertSame(20, $assessment->srqResponses()->count());
        $this->assertSame(5, $assessment->riskAssessment()->count());
        $this->assertSame(3, $assessment->functionAssessment()->count());
        $this->assertSame(1, $assessment->triageResult()->count());
        $this->assertSame($bambang->id, $emergency->fresh()->patient_id);
        $this->assertSame($relawan->id, $emergency->fresh()->user_id);
        $this->assertSame($candi->id, $emergency->fresh()->shelter_id);
        $this->assertSame(EmergencyStatus::ACKNOWLEDGED, $emergency->fresh()->status);
        $this->assertSame('Nama Siti Diperbarui', $siti->fresh()->name);
        $this->assertSame($otherRegion->id, $otherShelter->fresh()->region_id);
        $this->assertSame($otherShelter->id, $otherPatient->fresh()->shelter_id);
        $this->assertSame('Alamat Lain', $otherFacility->fresh()->address);
    }

    public function test_existing_demo_records_from_random_uuid_seeder_are_reused(): void
    {
        $region = Region::create(['name' => 'Kawasan Bencana Merapi - DIY']);
        $shelter = Shelter::create([
            'region_id' => $region->id,
            'name' => 'Posko Candi',
            'address' => 'Balai Desa Candi, Sleman',
        ]);
        $facility = HealthcareFacility::create([
            'name' => 'RSUD Candi',
            'type' => 'Rumah Sakit Rujukan',
            'address' => 'Jl. Kaliurang Km 12, Sleman',
        ]);
        $relawan = User::updateOrCreate(
            ['email' => 'relawan@rapidmind.id'],
            ['name' => 'Relawan Demo', 'password' => 'password', 'role' => UserRole::RELAWAN, 'shelter_id' => $shelter->id],
        );
        $healthcare = User::updateOrCreate(
            ['email' => 'nakes@rapidmind.id'],
            ['name' => 'Nakes Demo', 'password' => 'password', 'role' => UserRole::HEALTHCARE, 'facility_id' => $facility->id],
        );
        $siti = Patient::create([
            'nik' => '3404010101850001',
            'name' => 'Siti Aminah',
            'created_by' => $relawan->id,
            'shelter_id' => $shelter->id,
        ]);
        $bambang = Patient::create([
            'nik' => '3404010202780002',
            'name' => 'Bambang Sudarmono',
            'created_by' => $relawan->id,
            'shelter_id' => $shelter->id,
        ]);
        $assessment = Assessment::create([
            'patient_id' => $siti->id,
            'user_id' => $relawan->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
        ]);
        TriageResult::create([
            'assessment_id' => $assessment->id,
            'srq_score' => 6,
            'risk_score' => 3,
            'function_score' => 2,
            'total_score' => 11,
            'system_recommendation' => TriageCategory::T2,
            'is_red_flag_override' => false,
        ]);
        $emergency = EmergencyEvent::create([
            'patient_id' => $bambang->id,
            'user_id' => $relawan->id,
            'shelter_id' => $shelter->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::ACKNOWLEDGED,
            'notes' => 'Penyintas mengungkapkan rasa ingin menyusul keluarga yang tiada dan menunjukkan agitasi berat di tenda 3.',
        ]);

        $this->seed(DemoSeeder::class);
        $this->seed(DemoSeeder::class);

        $this->assertSame(1, Region::where('name', 'Kawasan Bencana Merapi - DIY')->count());
        $this->assertSame(1, Shelter::where('region_id', $region->id)->where('name', 'Posko Candi')->count());
        $this->assertSame(1, HealthcareFacility::where('name', 'RSUD Candi')->count());
        $this->assertSame($shelter->id, $relawan->fresh()->shelter_id);
        $this->assertSame($facility->id, $healthcare->fresh()->facility_id);
        $this->assertSame(1, Patient::where('nik', $siti->nik)->count());
        $this->assertSame(1, Patient::where('nik', $bambang->nik)->count());
        $this->assertSame($assessment->id, Assessment::where('patient_id', $siti->id)->firstOrFail()->id);
        $this->assertSame(20, $assessment->srqResponses()->count());
        $this->assertSame(5, $assessment->riskAssessment()->count());
        $this->assertSame(3, $assessment->functionAssessment()->count());
        $this->assertSame($emergency->id, EmergencyEvent::where('patient_id', $bambang->id)->firstOrFail()->id);
        $this->assertSame(EmergencyStatus::ACKNOWLEDGED, $emergency->fresh()->status);
    }
}
