import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '^/projects($|/[^/]+/(details|close|tasks))': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                bypass(req) {
                    if (req.headers.accept?.includes('text/html')) {
                        return req.url;
                    }
                },
            },
            
            '^/projects$': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },

            '/auth/login': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/auth/register': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/users': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            }
        },
    },
});
