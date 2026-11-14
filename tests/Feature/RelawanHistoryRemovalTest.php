<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class RelawanHistoryRemovalTest extends TestCase
{
    use DatabaseTransactions;

    public function test_old_history_url_redirects_without_returning_clinical_history(): void
    {
        $owner = User::factory()->create(['role' => UserRole::RELAWAN, 'is_active' => true]);
        $this->actingAs($owner)->get('/relawan/data')
            ->assertRedirect('/relawan/home')
            ->assertDontSee('Relawan/Data');
        $this->get('/relawan/home')->assertInertia(fn (Assert $page) => $page
            ->component('Relawan/Home', false)->missing('recentAssessments')->etc());
    }

    public function test_old_history_url_preserves_role_authorization(): void
    {
        $this->get('/relawan/data')->assertRedirect('/login');
        $other = User::factory()->create(['role' => UserRole::HEALTHCARE, 'is_active' => true]);
        $this->actingAs($other)->get('/relawan/data')
            ->assertRedirect('/healthcare/emergencies')->assertSessionHasErrors('access');
        $this->getJson('/relawan/data')->assertForbidden();
    }
}
