import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/v1': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/v2': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/projects': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/auth': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/users': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api/notifications': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
