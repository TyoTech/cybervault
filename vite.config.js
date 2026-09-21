import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
    // Development origin dikunci ke 127.0.0.1:5173 agar konsisten dengan
    // APP_URL (http://127.0.0.1:8000) dan CSP dev. Tanpa pin ini Vite bisa
    // bind ke localhost yang resolve ke [::1] (IPv6) dan memicu CSP violation.
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        hmr: {
            host: '127.0.0.1',
        },
    },
    build: {
        rollupOptions: {
            input: ['resources/css/app.css', 'resources/js/app.tsx']
        }
    }
});
