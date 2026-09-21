<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\CyberStorageService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SettingsController extends Controller
{
    public function edit(
        Request $request,
        CyberStorageService $storage
    ): Response {
        $root = $storage->root();

        return Inertia::render('Settings/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),

            'cyberStorage' => [
                'parent' => dirname($root),
                'folder' => basename($root),
                'root' => $root,
            ],
        ]);
    }

    public function updateProfile(
        ProfileUpdateRequest $request
    ): RedirectResponse {
        $user = $request->user();

        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return Redirect::route('settings.edit');
    }

    public function destroyAccount(
        Request $request
    ): RedirectResponse {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    public function updateStorage(
        Request $request,
        CyberStorageService $storage
    ): RedirectResponse {
        $validated = $request->validate([
            'parent' => ['required', 'string', 'max:2000'],
            'folder' => [
                'required',
                'string',
                'max:100',
                'regex:/^[A-Za-z0-9._-]+$/',
            ],
        ]);

        try {
            $root = $storage->migrateTo(
                $validated['parent'],
                $validated['folder']
            );
        } catch (RuntimeException $e) {
            return back()->withErrors([
                'parent' => $e->getMessage(),
            ]);
        }

        return back()
            ->with('status', 'Lokasi penyimpanan berhasil diperbarui.')
            ->with('cyberStorageRoot', $root);
    }
}