<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Hindari error "Vite manifest not found" ketika frontend belum di-build (npm run build).
        // Test ini memfokuskan backend, sehingga asset frontend tidak diperlukan.
        $this->withoutVite();
    }
}