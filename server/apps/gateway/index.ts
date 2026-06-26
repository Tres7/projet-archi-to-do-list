import { loadEnv } from '@app/common/env/loadEnv';
loadEnv();

import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { buildProxyRoutes } from './routes.ts';

const gatewayPort = process.env.GATEWAY_PORT || 3000;

const app = express();

app.use(express.json());

for (const route of buildProxyRoutes()) {
    app.use(
        route.path,
        createProxyMiddleware({
            target: route.target,
            changeOrigin: true,
            logger: console,
            on: {
                proxyReq: fixRequestBody,
            },
        }),
    );
}

app.use((_req, res) => {
    console.warn(`No route matched for ${_req.method} ${_req.originalUrl}`);
    res.status(404).json({
        message: 'Route not found in API Gateway',
    });
});

app.listen(gatewayPort, () => {
    console.log(`Gateway started on port ${gatewayPort}`);
});