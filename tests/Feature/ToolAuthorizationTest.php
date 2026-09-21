<?php

namespace Tests\Feature;

use App\Models\Tool;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ToolAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->other = User::factory()->create();
    }

    private function makeTool(User $user): Tool
    {
        return Tool::create([
            'user_id' => $user->id,
            'name' => 'Tool ' . uniqid(),
            'workflow' => 'Recon',
            'notes' => null,
            'commands' => [['desc' => 'Scan', 'code' => 'nmap -F']],
        ]);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('tools.index'))->assertRedirect(route('login'));
    }

    public function test_owner_can_access_their_tools(): void
    {
        $this->makeTool($this->owner);

        $this->actingAs($this->owner)
            ->get(route('tools.index'))
            ->assertOk();
    }

    public function test_other_user_cannot_edit_tool(): void
    {
        $tool = $this->makeTool($this->owner);

        $this->actingAs($this->other)
            ->get(route('tools.edit', $tool))
            ->assertForbidden();
    }

    public function test_other_user_cannot_update_tool(): void
    {
        $tool = $this->makeTool($this->owner);

        $this->actingAs($this->other)
            ->put(route('tools.update', $tool), [
                'name' => 'Dibajak',
                'workflow' => 'Recon',
                'commands' => [['desc' => 'x', 'code' => 'y']],
            ])
            ->assertForbidden();
    }

    public function test_other_user_cannot_delete_tool(): void
    {
        $tool = $this->makeTool($this->owner);

        $this->actingAs($this->other)
            ->delete(route('tools.destroy', $tool))
            ->assertForbidden();

        $this->assertDatabaseHas('tools', ['id' => $tool->id]);
    }

    public function test_owner_can_delete_their_tool(): void
    {
        $tool = $this->makeTool($this->owner);

        $this->actingAs($this->owner)
            ->delete(route('tools.destroy', $tool))
            ->assertRedirect();

        $this->assertDatabaseMissing('tools', ['id' => $tool->id]);
    }
}