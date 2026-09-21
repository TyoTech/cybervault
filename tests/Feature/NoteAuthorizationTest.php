<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NoteAuthorizationTest extends TestCase
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

    private function makeNote(User $user): Note
    {
        return Note::create([
            'user_id' => $user->id,
            'title' => 'Catatan ' . uniqid(),
            'slug' => 'catatan-' . uniqid(),
            'content' => 'DOCX',
            'path_folder' => 'notes/note-' . uniqid(),
        ]);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $note = $this->makeNote($this->owner);

        $this->get(route('notes.index'))->assertRedirect(route('login'));
        $this->get(route('notes.show', $note))->assertRedirect(route('login'));
    }

    public function test_owner_can_view_their_note(): void
    {
        $note = $this->makeNote($this->owner);

        $this->actingAs($this->owner)
            ->get(route('notes.show', $note))
            ->assertOk();
    }

    public function test_other_user_cannot_view_note(): void
    {
        $note = $this->makeNote($this->owner);

        $this->actingAs($this->other)
            ->get(route('notes.show', $note))
            ->assertForbidden();
    }

    public function test_other_user_cannot_edit_note(): void
    {
        $note = $this->makeNote($this->owner);

        $this->actingAs($this->other)
            ->get(route('notes.edit', $note))
            ->assertForbidden();
    }

    public function test_other_user_cannot_update_note(): void
    {
        $note = $this->makeNote($this->owner);

        $this->actingAs($this->other)
            ->patch(route('notes.update', $note), ['title' => 'Dibajak', 'content' => 'x'])
            ->assertForbidden();
    }

    public function test_other_user_cannot_delete_note(): void
    {
        $note = $this->makeNote($this->owner);

        $this->actingAs($this->other)
            ->delete(route('notes.destroy', $note))
            ->assertForbidden();

        $this->assertDatabaseHas('notes', ['id' => $note->id]);
    }

    public function test_owner_can_delete_their_note(): void
    {
        $note = $this->makeNote($this->owner);

        $this->actingAs($this->owner)
            ->delete(route('notes.destroy', $note))
            ->assertRedirect(route('notes.index'));

        $this->assertDatabaseMissing('notes', ['id' => $note->id]);
    }
}