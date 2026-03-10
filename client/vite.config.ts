import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/projects': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/auth/login': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/auth/register': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/users': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
