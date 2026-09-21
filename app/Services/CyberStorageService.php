<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\File;
use RuntimeException;

class CyberStorageService
{
    public const PARENT_KEY = 'cyber_storage_parent';
    public const FOLDER_KEY = 'cyber_storage_folder';

    public function defaultRoot(): string
    {
        return env('CYBER_DISK_ROOT') ?: storage_path('app/cyber');
    }

    public function root(): string
    {
        $parent = AppSetting::getValue(self::PARENT_KEY);
        $folder = AppSetting::getValue(self::FOLDER_KEY);

        if (!$parent || !$folder) {
            return $this->defaultRoot();
        }

        return rtrim($parent, DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR
            . $folder;
    }

    public function setLocation(string $parent, string $folder): string
    {
        $parent = rtrim(trim($parent), DIRECTORY_SEPARATOR);
        $folder = trim($folder);

        if ($parent === '' || !str_starts_with($parent, DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Lokasi induk harus berupa path absolut.');
        }

        if (!preg_match('/^[A-Za-z0-9._-]+$/', $folder)) {
            throw new RuntimeException(
                'Nama folder hanya boleh berisi huruf, angka, titik, underscore, dan tanda minus.'
            );
        }

        if (in_array($folder, ['.', '..'], true)) {
            throw new RuntimeException('Nama folder tidak valid.');
        }

        if (!File::isDirectory($parent)) {
            throw new RuntimeException('Lokasi induk tidak ditemukan.');
        }

        $root = $parent . DIRECTORY_SEPARATOR . $folder;

        if (!File::isDirectory($root)) {
            File::makeDirectory($root, 0755, true);
        }

        AppSetting::setValue(self::PARENT_KEY, $parent);
        AppSetting::setValue(self::FOLDER_KEY, $folder);

        return $root;
    }

    public function migrateTo(string $parent, string $folder): string
    {
        $oldRoot = $this->root();

        $parent = rtrim(trim($parent), DIRECTORY_SEPARATOR);
        $folder = trim($folder);

        if (!str_starts_with($parent, DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Lokasi induk harus berupa path absolut.');
        }

        if (!preg_match('/^[A-Za-z0-9._-]+$/', $folder)) {
            throw new RuntimeException('Nama folder tidak valid.');
        }

        if (!File::isDirectory($parent)) {
            throw new RuntimeException('Lokasi induk tidak ditemukan.');
        }

        $newRoot = $parent . DIRECTORY_SEPARATOR . $folder;

        $oldReal = realpath($oldRoot);
        $newReal = realpath($newRoot);

        if ($oldReal && $newReal && $oldReal === $newReal) {
            AppSetting::setValue(self::PARENT_KEY, $parent);
            AppSetting::setValue(self::FOLDER_KEY, $folder);

            return $newRoot;
        }

        if ($oldReal && $newReal) {
            if (str_starts_with($newReal . DIRECTORY_SEPARATOR, $oldReal . DIRECTORY_SEPARATOR)) {
                throw new RuntimeException('Folder tujuan tidak boleh berada di dalam folder sumber.');
            }

            if (str_starts_with($oldReal . DIRECTORY_SEPARATOR, $newReal . DIRECTORY_SEPARATOR)) {
                throw new RuntimeException('Folder sumber tidak boleh berada di dalam folder tujuan.');
            }
        }

        if (!File::isDirectory($newRoot)) {
            File::makeDirectory($newRoot, 0755, true);
        }

        if (File::isDirectory($oldRoot)) {
            File::copyDirectory($oldRoot, $newRoot);
        }

        AppSetting::setValue(self::PARENT_KEY, $parent);
        AppSetting::setValue(self::FOLDER_KEY, $folder);

        return $newRoot;
    }
}