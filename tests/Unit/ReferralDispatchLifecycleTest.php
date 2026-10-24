<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\ClinicalReferralStatus;
use App\Enums\EmergencyDispatchStatus;
use App\Enums\ReferralStatus;
use PHPUnit\Framework\TestCase;

final class ReferralDispatchLifecycleTest extends TestCase
{
    public function test_clinical_referral_has_only_active_and_completed_states(): void
    {
        $this->assertSame(['ACTIVE', 'COMPLETED'], array_column(ClinicalReferralStatus::cases(), 'value'));
        $this->assertSame([ClinicalReferralStatus::COMPLETED], ClinicalReferralStatus::ACTIVE->allowedNextStatuses());
        $this->assertSame([], ClinicalReferralStatus::COMPLETED->allowedNextStatuses());

        foreach (ClinicalReferralStatus::cases() as $from) {
            foreach (ClinicalReferralStatus::cases() as $to) {
                $this->assertSame(
                    $from === ClinicalReferralStatus::ACTIVE && $to === ClinicalReferralStatus::COMPLETED,
                    $from->canTransitionTo($to),
                    "{$from->value} -> {$to->value}",
                );
            }
        }

        foreach (['ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'TRANSPORT', 'CANCELLED', 'NONE'] as $status) {
            $this->assertNull(ClinicalReferralStatus::tryFrom($status));
        }
    }

    public function test_dispatch_allows_only_the_approved_forward_edges(): void
    {
        $edges = [
            'ASSIGNED' => ['EN_ROUTE'],
            'EN_ROUTE' => ['ON_SITE'],
            'ON_SITE' => ['TRANSPORT', 'COMPLETED'],
            'TRANSPORT' => ['COMPLETED'],
            'COMPLETED' => [],
        ];

        $this->assertSame(array_keys($edges), array_column(EmergencyDispatchStatus::cases(), 'value'));
        foreach (EmergencyDispatchStatus::cases() as $from) {
            $this->assertSame($edges[$from->value], array_column($from->allowedNextStatuses(), 'value'));
            foreach (EmergencyDispatchStatus::cases() as $to) {
                $this->assertSame(
                    in_array($to->value, $edges[$from->value], true),
                    $from->canTransitionTo($to),
                    "{$from->value} -> {$to->value}",
                );
            }
        }

        foreach (['ACTIVE', 'CANCELLED', 'NONE', 'UNASSIGNED'] as $status) {
            $this->assertNull(EmergencyDispatchStatus::tryFrom($status));
        }
    }

    public function test_existing_referral_lifecycle_remains_compatible_until_cutover(): void
    {
        $this->assertTrue(ReferralStatus::ACTIVE->canTransitionTo(ReferralStatus::EN_ROUTE));
        $this->assertFalse(ReferralStatus::ACTIVE->canTransitionTo(ReferralStatus::COMPLETED));
        $this->assertTrue(ReferralStatus::ON_SITE->canTransitionTo(ReferralStatus::COMPLETED));
    }
}
