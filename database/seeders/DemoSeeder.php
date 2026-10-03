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

final class DemoSeeder extends Seeder
{
    private const SITI_ASSESSMENT_ID = '6c000387-12cc-5435-a880-6b4967b08031';
    private const BAMBANG_EMERGENCY_ID = '81b5391a-9632-528b-a211-12a907125561';
    private const NANDO_ASSESSMENT_ID = 'a0000089-12cc-5435-a880-6b4967b00089';
    private const NANDO_EMERGENCY_ID = 'e0000089-12cc-5435-a880-6b4967b00089';
    private const DEWI_ASSESSMENT_ID = 'a0000042-12cc-5435-a880-6b4967b00042';
    private const SURYA_ASSESSMENT_ID = 'a0000015-12cc-5435-a880-6b4967b00015';

    public function run(): void
    {
        // 1. Regions
        $region = Region::firstOrCreate([
            'name' => 'Kawasan Bencana Merapi - DIY',
        ]);

        // PostGIS MultiPolygon for region if spatial geometry column exists
        try {
            DB::statement("UPDATE regions SET geometry = ST_Multi(ST_GeomFromText('POLYGON((110.3 7.6, 110.5 7.6, 110.5 7.8, 110.3 7.8, 110.3 7.6))', 4326)) WHERE id = ? AND geometry IS NULL", [$region->id]);
        } catch (\Throwable) {
            // Safe fallback if PostGIS statement variance occurs
        }

        // 2. Shelters
        $shelterCandi = Shelter::firstOrCreate([
            'region_id' => $region->id,
            'name' => 'Posko Candi',
        ], [
            'address' => 'Balai Desa Candi, Sleman',
            'is_active' => true,
        ]);

        $shelterUtama = Shelter::firstOrCreate([
            'region_id' => $region->id,
            'name' => 'Posko Utama Maguwo',
        ], [
            'address' => 'Stadion Maguwoharjo, Sleman',
            'is_active' => true,
        ]);

        $shelterPakem = Shelter::firstOrCreate([
            'region_id' => $region->id,
            'name' => 'Posko Siaga Pakem',
        ], [
            'address' => 'Kecamatan Pakem, Sleman',
            'is_active' => true,
        ]);

        // Set spatial coordinates
        try {
            DB::statement("UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(110.4234, -7.6892), 4326) WHERE id = ? AND location IS NULL", [$shelterCandi->id]);
            DB::statement("UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(110.4085, -7.7584), 4326) WHERE id = ? AND location IS NULL", [$shelterUtama->id]);
            DB::statement("UPDATE shelters SET location = ST_SetSRID(ST_MakePoint(110.4191, -7.6621), 4326) WHERE id = ? AND location IS NULL", [$shelterPakem->id]);
        } catch (\Throwable) {
        }

        // 3. Healthcare Facilities
        $rsud = HealthcareFacility::firstOrCreate([
            'name' => 'RSUD Candi',
            'type' => 'Rumah Sakit Rujukan',
            'address' => 'Jl. Kaliurang Km 12, Sleman',
        ], [
            'is_active' => true,
        ]);

        $puskesmas = HealthcareFacility::firstOrCreate([
            'name' => 'Puskesmas Pakem',
            'type' => 'Puskesmas',
            'address' => 'Jl. Pakem-Turi, Sleman',
        ], [
            'is_active' => true,
        ]);

        $psc119 = HealthcareFacility::firstOrCreate([
            'name' => 'PSC 119 Sleman',
            'type' => 'PSC 119',
            'address' => 'Dinas Kesehatan Kab. Sleman',
        ], [
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

        // Accounts may already exist from login setup without their demo assignment.
        if ($relawan->shelter_id === null) {
            $relawan->update(['shelter_id' => $shelterCandi->id]);
        }
        if (blank($relawan->phone_number)) {
            $relawan->update(['phone_number' => '+6281234567890']);
        }
        if ($healthcare->facility_id === null) {
            $healthcare->update(['facility_id' => $rsud->id]);
        }

        // 5. Seed Demo Patients
        $p1 = Patient::firstOrCreate([
            'nik' => '3404010101850001',
        ], [
            'name' => 'Siti Aminah',
            'age' => 42,
            'gender' => 'Perempuan',
            'shelter_id' => $shelterCandi->id,
            'created_by' => $relawan->id,
        ]);

        $p2 = Patient::firstOrCreate([
            'nik' => '3404010202780002',
        ], [
            'name' => 'Bambang Sudarmono',
            'age' => 58,
            'gender' => 'Laki-laki',
            'shelter_id' => $shelterCandi->id,
            'created_by' => $relawan->id,
        ]);

        $p3 = Patient::firstOrCreate([
            'nik' => '3404010303950003',
        ], [
            'name' => 'Dewi Lestari',
            'age' => 29,
            'gender' => 'Perempuan',
            'shelter_id' => $shelterPakem->id,
            'created_by' => $relawan->id,
        ]);

        // 6. Seed Completed Assessment (T2) for Siti Aminah
        // Reuse an assessment from the earlier seeder, whose UUID was generated at insert time.
        $a1 = Assessment::find(self::SITI_ASSESSMENT_ID)
            ?? Assessment::where('patient_id', $p1->id)
                ->where('user_id', $relawan->id)
                ->where('status', AssessmentStatus::COMPLETED)
                ->where('mode', AssessmentMode::VERBAL)
                ->whereHas('triageResult', fn ($query) => $query
                    ->where('srq_score', 6)
                    ->where('risk_score', 3)
                    ->where('function_score', 2)
                    ->where('total_score', 11)
                    ->where('system_recommendation', TriageCategory::T2)
                    ->where('is_red_flag_override', false))
                ->first();

        if (! $a1) {
            $a1 = new Assessment([
                'patient_id' => $p1->id,
                'user_id' => $relawan->id,
                'status' => AssessmentStatus::COMPLETED,
                'mode' => AssessmentMode::VERBAL,
                'started_at' => now()->subHours(3),
                'completed_at' => now()->subHours(2),
            ]);
            $a1->id = self::SITI_ASSESSMENT_ID;
            $a1->save();
        }

        // 6 SRQ Yes
        for ($i = 1; $i <= 20; $i++) {
            SrqResponse::firstOrCreate(
                ['assessment_id' => $a1->id, 'question_number' => $i],
                ['answer' => in_array($i, [1, 2, 3, 4, 6, 9])],
            );
        }

        // Risk: R1=true (2), R3=true (1) => 3
        RiskResponse::firstOrCreate(['assessment_id' => $a1->id, 'indicator' => 'R1'], ['answer' => true, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $a1->id, 'indicator' => 'R2'], ['answer' => false, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $a1->id, 'indicator' => 'R3'], ['answer' => true, 'weight' => 1]);
        RiskResponse::firstOrCreate(['assessment_id' => $a1->id, 'indicator' => 'R4'], ['answer' => false, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $a1->id, 'indicator' => 'R5'], ['answer' => false, 'weight' => 1]);

        // Function: F1=1, F2=1, F3=0 => 2
        FunctionResponse::firstOrCreate(['assessment_id' => $a1->id, 'domain' => 'F1'], ['level' => 1]);
        FunctionResponse::firstOrCreate(['assessment_id' => $a1->id, 'domain' => 'F2'], ['level' => 1]);
        FunctionResponse::firstOrCreate(['assessment_id' => $a1->id, 'domain' => 'F3'], ['level' => 0]);

        // Total = 6 + 3 + 2 = 11 => T2
        TriageResult::firstOrCreate(['assessment_id' => $a1->id], [
            'srq_score' => 6,
            'risk_score' => 3,
            'function_score' => 2,
            'total_score' => 11,
            'system_recommendation' => TriageCategory::T2,
            'is_red_flag_override' => false,
        ]);

        // 7. Seed an Active T0 Emergency Incident for Bambang Sudarmono
        // The exact demo note identifies a legacy seeded incident without resetting its workflow status.
        $emergency = EmergencyEvent::find(self::BAMBANG_EMERGENCY_ID)
            ?? EmergencyEvent::where('patient_id', $p2->id)
                ->where('user_id', $relawan->id)
                ->where('red_flag_type', RedFlagType::SUICIDAL_IDEATION)
                ->where('notes', 'Penyintas mengungkapkan rasa ingin menyusul keluarga yang tiada dan menunjukkan agitasi berat di tenda 3.')
                ->first();

        if (! $emergency) {
            $emergency = new EmergencyEvent([
                'patient_id' => $p2->id,
                'user_id' => $relawan->id,
                'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
                'status' => EmergencyStatus::PENDING,
                'latitude' => -7.6892,
                'longitude' => 110.4234,
                'shelter_id' => $shelterCandi->id,
                'notes' => 'Penyintas mengungkapkan rasa ingin menyusul keluarga yang tiada dan menunjukkan agitasi berat di tenda 3.',
            ]);
            $emergency->id = self::BAMBANG_EMERGENCY_ID;
            $emergency->save();
        }

        // 8. Seed Nando Pratama (T0 Kritis - RM-2026-000089)
        $pNando = Patient::firstOrCreate([
            'nik' => '3404012808980089',
        ], [
            'name' => 'Nando Pratama',
            'age' => 28,
            'gender' => 'Laki-laki',
            'shelter_id' => $shelterCandi->id,
            'created_by' => $relawan->id,
        ]);

        $aNando = Assessment::find(self::NANDO_ASSESSMENT_ID);
        if (!$aNando) {
            $aNando = new Assessment([
                'patient_id' => $pNando->id,
                'user_id' => $relawan->id,
                'status' => AssessmentStatus::COMPLETED,
                'mode' => AssessmentMode::VERBAL,
                'started_at' => now()->subMinutes(35),
                'completed_at' => now()->subMinutes(20),
            ]);
            $aNando->id = self::NANDO_ASSESSMENT_ID;
            $aNando->save();
        }

        for ($i = 1; $i <= 20; $i++) {
            SrqResponse::firstOrCreate(
                ['assessment_id' => $aNando->id, 'question_number' => $i],
                ['answer' => in_array($i, [1, 2, 3, 4, 6, 7, 9, 10, 11, 13, 14, 15, 16, 17])],
            );
        }

        RiskResponse::firstOrCreate(['assessment_id' => $aNando->id, 'indicator' => 'R1'], ['answer' => true, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aNando->id, 'indicator' => 'R2'], ['answer' => true, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aNando->id, 'indicator' => 'R3'], ['answer' => true, 'weight' => 1]);
        RiskResponse::firstOrCreate(['assessment_id' => $aNando->id, 'indicator' => 'R4'], ['answer' => false, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aNando->id, 'indicator' => 'R5'], ['answer' => false, 'weight' => 1]);

        FunctionResponse::firstOrCreate(['assessment_id' => $aNando->id, 'domain' => 'F1'], ['level' => 2]);
        FunctionResponse::firstOrCreate(['assessment_id' => $aNando->id, 'domain' => 'F2'], ['level' => 2]);
        FunctionResponse::firstOrCreate(['assessment_id' => $aNando->id, 'domain' => 'F3'], ['level' => 1]);

        TriageResult::firstOrCreate(['assessment_id' => $aNando->id], [
            'srq_score' => 14,
            'risk_score' => 5,
            'function_score' => 5,
            'total_score' => 24,
            'system_recommendation' => TriageCategory::T0_SUSPECT,
            'is_red_flag_override' => true,
            'red_flag_source' => 'SUICIDAL_IDEATION',
        ]);

        $eNando = EmergencyEvent::find(self::NANDO_EMERGENCY_ID);
        if (!$eNando) {
            $eNando = new EmergencyEvent([
                'patient_id' => $pNando->id,
                'assessment_id' => $aNando->id,
                'user_id' => $relawan->id,
                'red_flag_type' => RedFlagType::SUICIDAL_IDEATION,
                'status' => EmergencyStatus::PENDING,
                'latitude' => -7.6895,
                'longitude' => 110.4238,
                'shelter_id' => $shelterCandi->id,
                'notes' => 'Pikiran bunuh diri aktif pasca kehilangan seluruh keluarga dan tempat tinggal di lereng Merapi. Agitasi tinggi dan menolak kontak sosial.',
            ]);
            $eNando->id = self::NANDO_EMERGENCY_ID;
            $eNando->save();
        }

        // 9. Seed T1 Assessment for Dewi Lestari (RM-2026-000042)
        $aDewi = Assessment::find(self::DEWI_ASSESSMENT_ID);
        if (!$aDewi) {
            $aDewi = new Assessment([
                'patient_id' => $p3->id,
                'user_id' => $relawan->id,
                'status' => AssessmentStatus::COMPLETED,
                'mode' => AssessmentMode::VERBAL,
                'started_at' => now()->subHours(2),
                'completed_at' => now()->subHours(1),
            ]);
            $aDewi->id = self::DEWI_ASSESSMENT_ID;
            $aDewi->save();
        }

        for ($i = 1; $i <= 20; $i++) {
            SrqResponse::firstOrCreate(
                ['assessment_id' => $aDewi->id, 'question_number' => $i],
                ['answer' => in_array($i, [1, 2, 4, 6, 8, 9, 10, 12, 13])],
            );
        }

        RiskResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'indicator' => 'R1'], ['answer' => true, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'indicator' => 'R2'], ['answer' => true, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'indicator' => 'R3'], ['answer' => false, 'weight' => 1]);
        RiskResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'indicator' => 'R4'], ['answer' => false, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'indicator' => 'R5'], ['answer' => false, 'weight' => 1]);

        FunctionResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'domain' => 'F1'], ['level' => 1]);
        FunctionResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'domain' => 'F2'], ['level' => 2]);
        FunctionResponse::firstOrCreate(['assessment_id' => $aDewi->id, 'domain' => 'F3'], ['level' => 1]);

        TriageResult::firstOrCreate(['assessment_id' => $aDewi->id], [
            'srq_score' => 9,
            'risk_score' => 4,
            'function_score' => 4,
            'total_score' => 17,
            'system_recommendation' => TriageCategory::T1,
            'is_red_flag_override' => false,
        ]);

        // 10. Seed T3 Assessment for Surya Saputra (RM-2026-000015)
        $pSurya = Patient::firstOrCreate([
            'nik' => '3404011505910015',
        ], [
            'name' => 'Surya Saputra',
            'age' => 35,
            'gender' => 'Laki-laki',
            'shelter_id' => $shelterPakem->id,
            'created_by' => $relawan->id,
        ]);

        $aSurya = Assessment::find(self::SURYA_ASSESSMENT_ID);
        if (!$aSurya) {
            $aSurya = new Assessment([
                'patient_id' => $pSurya->id,
                'user_id' => $relawan->id,
                'status' => AssessmentStatus::COMPLETED,
                'mode' => AssessmentMode::VERBAL,
                'started_at' => now()->subHours(5),
                'completed_at' => now()->subHours(4),
            ]);
            $aSurya->id = self::SURYA_ASSESSMENT_ID;
            $aSurya->save();
        }

        for ($i = 1; $i <= 20; $i++) {
            SrqResponse::firstOrCreate(
                ['assessment_id' => $aSurya->id, 'question_number' => $i],
                ['answer' => in_array($i, [1, 4, 9])],
            );
        }

        RiskResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'indicator' => 'R1'], ['answer' => false, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'indicator' => 'R2'], ['answer' => false, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'indicator' => 'R3'], ['answer' => false, 'weight' => 1]);
        RiskResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'indicator' => 'R4'], ['answer' => false, 'weight' => 2]);
        RiskResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'indicator' => 'R5'], ['answer' => false, 'weight' => 1]);

        FunctionResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'domain' => 'F1'], ['level' => 0]);
        FunctionResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'domain' => 'F2'], ['level' => 1]);
        FunctionResponse::firstOrCreate(['assessment_id' => $aSurya->id, 'domain' => 'F3'], ['level' => 0]);

        TriageResult::firstOrCreate(['assessment_id' => $aSurya->id], [
            'srq_score' => 3,
            'risk_score' => 0,
            'function_score' => 1,
            'total_score' => 4,
            'system_recommendation' => TriageCategory::T3,
            'is_red_flag_override' => false,
        ]);
    }
}
