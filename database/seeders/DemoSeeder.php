<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AssessmentMode;
use App\Enums\AssessmentStatus;
use App\Enums\EmergencyStatus;
use App\Enums\RedFlagType;
use App\Enums\TriageCategory;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\EmergencyEvent;
use App\Models\FunctionResponse;
use App\Models\HealthcareFacility;
use App\Models\Patient;
use App\Models\Region;
use App\Models\RiskResponse;
use App\Models\Shelter;
use App\Models\SrqResponse;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Regions
        $region = Region::create([
            'name' => 'Kawasan Bencana Merapi - DIY',
        ]);

        // PostGIS MultiPolygon for region if spatial geometry column exists
        try {
            DB::statement("UPDATE regions SET geometry = ST_Multi(ST_GeomFromText('POLYGON((110.3 7.6, 110.5 7.6, 110.5 7.8, 110.3 7.8, 110.3 7.6))', 4326)) WHERE id = ?", [$region->id]);
        } catch (\Throwable) {
            // Safe fallback if PostGIS statement variance occurs
        }

        // 2. Shelters
        $shelterCandi = Shelter::create([
            'region_id' => $region->id,
            'name' => 'Posko Candi',
            'address' => 'Balai Desa Candi, Sleman',
            'is_active' => true,
        ]);

        $shelterUtama = Shelter::create([
            'region_id' => $region->id,
            'name' => 'Posko Utama Maguwo',
            'address' => 'Stadion Maguwoharjo, Sleman',
            'is_active' => true,
        ]);

        $shelterPakem = Shelter::create([
            'region_id' => $region->id,
            'name' => 'Posko Siaga Pakem',
            'address' => 'Kecamatan Pakem, Sleman',
            'is_active' => true,
        ]);

        // Set spatial coordinates
        try {
            DB::statement("UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(110.4234, -7.6892), 4326) WHERE id = ?", [$shelterCandi->id]);
            DB::statement("UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(110.4085, -7.7584), 4326) WHERE id = ?", [$shelterUtama->id]);
            DB::statement("UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(110.4191, -7.6621), 4326) WHERE id = ?", [$shelterPakem->id]);
        } catch (\Throwable) {
        }

        // 3. Healthcare Facilities
        $rsud = HealthcareFacility::create([
            'name' => 'RSUD Candi',
            'type' => 'Rumah Sakit Rujukan',
            'address' => 'Jl. Kaliurang Km 12, Sleman',
            'is_active' => true,
        ]);

        $puskesmas = HealthcareFacility::create([
            'name' => 'Puskesmas Pakem',
            'type' => 'Puskesmas',
            'address' => 'Jl. Pakem-Turi, Sleman',
            'is_active' => true,
        ]);

        $psc119 = HealthcareFacility::create([
            'name' => 'PSC 119 Sleman',
            'type' => 'PSC 119',
            'address' => 'Dinas Kesehatan Kab. Sleman',
            'is_active' => true,
        ]);

        // 4. Seed Canonical Users
        $admin = User::firstOrCreate(
            ['email' => 'admin@rapidmind.id'],
            [
                'name' => 'Admin BPBD / Dinkes',
                'password' => Hash::make('password'),
                'role' => UserRole::ADMIN,
                'token_version' => 1,
                'is_active' => true,
            ]
        );

        $relawan = User::firstOrCreate(
            ['email' => 'relawan@rapidmind.id'],
            [
                'name' => 'Relawan Lapangan Budi',
                'password' => Hash::make('password'),
                'role' => UserRole::RELAWAN,
                'token_version' => 1,
                'is_active' => true,
                'shelter_id' => $shelterCandi->id,
            ]
        );

        $healthcare = User::firstOrCreate(
            ['email' => 'nakes@rapidmind.id'],
            [
                'name' => 'dr. Rina Suryani, Sp.KJ',
                'password' => Hash::make('password'),
                'role' => UserRole::HEALTHCARE,
                'token_version' => 1,
                'is_active' => true,
                'facility_id' => $rsud->id,
            ]
        );

        // 5. Seed Demo Patients
        $p1 = Patient::create([
            'nik' => '3404010101850001',
            'name' => 'Siti Aminah',
            'age' => 42,
            'gender' => 'Perempuan',
            'shelter_id' => $shelterCandi->id,
            'created_by' => $relawan->id,
        ]);

        $p2 = Patient::create([
            'nik' => '3404010202780002',
            'name' => 'Bambang Sudarmono',
            'age' => 58,
            'gender' => 'Laki-laki',
            'shelter_id' => $shelterCandi->id,
            'created_by' => $relawan->id,
        ]);

        $p3 = Patient::create([
            'nik' => '3404010303950003',
            'name' => 'Dewi Lestari',
            'age' => 29,
            'gender' => 'Perempuan',
            'shelter_id' => $shelterPakem->id,
            'created_by' => $relawan->id,
        ]);

        // 6. Seed Completed Assessment (T2) for Siti Aminah
        $a1 = Assessment::create([
            'patient_id' => $p1->id,
            'user_id' => $relawan->id,
            'status' => AssessmentStatus::COMPLETED,
            'mode' => AssessmentMode::VERBAL,
            'started_at' => now()->subHours(3),
            'completed_at' => now()->subHours(2),
        ]);

        // 6 SRQ Yes
        for ($i = 1; $i <= 20; $i++) {
            SrqResponse::create([
                'assessment_id' => $a1->id,
                'question_number' => $i,
                'answer' => in_array($i, [1, 2, 3, 4, 6, 9]),
            ]);
        }

        // Risk: R1=true (2), R3=true (1) => 3
        RiskResponse::create(['assessment_id' => $a1->id, 'indicator' => 'R1', 'answer' => true, 'weight' => 2]);
        RiskResponse::create(['assessment_id' => $a1->id, 'indicator' => 'R2', 'answer' => false, 'weight' => 2]);
        RiskResponse::create(['assessment_id' => $a1->id, 'indicator' => 'R3', 'answer' => true, 'weight' => 1]);
        RiskResponse::create(['assessment_id' => $a1->id, 'indicator' => 'R4', 'answer' => false, 'weight' => 2]);
        RiskResponse::create(['assessment_id' => $a1->id, 'indicator' => 'R5', 'answer' => false, 'weight' => 1]);

        // Function: F1=1, F2=1, F3=0 => 2
        FunctionResponse::create(['assessment_id' => $a1->id, 'domain' => 'F1', 'level' => 1]);
        FunctionResponse::create(['assessment_id' => $a1->id, 'domain' => 'F2', 'level' => 1]);
        FunctionResponse::create(['assessment_id' => $a1->id, 'domain' => 'F3', 'level' => 0]);

        // Total = 6 + 3 + 2 = 11 => T2
        TriageResult::create([
            'assessment_id' => $a1->id,
            'srq_score' => 6,
            'risk_score' => 3,
            'function_score' => 2,
            'total_score' => 11,
            'system_recommendation' => TriageCategory::T2,
            'is_red_flag_override' => false,
        ]);

        // 7. Seed an Active T0 Emergency Incident for Bambang Sudarmono
        $emergency = EmergencyEvent::create([
            'patient_id' => $p2->id,
            'user_id' => $relawan->id,
            'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
            'status' => EmergencyStatus::PENDING,
            'latitude' => -7.6892,
            'longitude' => 110.4234,
            'shelter_id' => $shelterCandi->id,
            'notes' => 'Penyintas mengungkapkan rasa ingin menyusul keluarga yang tiada dan menunjukkan agitasi berat di tenda 3.',
        ]);
    }
}
