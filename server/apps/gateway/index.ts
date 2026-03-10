import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

const app = express();

app.use(express.json());

const authProxy = createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL + '/auth',
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

const usersProxy = createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL + '/users',
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

const projectProxy = createProxyMiddleware({
    target: process.env.PROJECT_SERVICE_URL,
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

app.use('/api/auth', authProxy);
app.use('/api/users', usersProxy);
app.use('/api/projects', projectProxy);

app.use((_req, res) => {
    res.status(404).json({
        message: 'Route not found in API Gateway',
    });
});

app.listen(process.env.GATEWAY_PORT, () => {
    console.log(`Gateway started on port ${process.env.GATEWAY_PORT}`);
});
