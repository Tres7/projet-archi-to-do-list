import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

const app = express();

app.use(express.json());

const authProxy = createProxyMiddleware({
    target: 'http://localhost:3002/auth',
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

const projectProxy = createProxyMiddleware({
    target: 'http://localhost:3003/projects',
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

app.use('/auth', authProxy);
app.use('/projects', projectProxy);

app.use((_req, res) => {
    res.status(404).json({
        message: 'Route not found in API Gateway',
    });
});

app.listen(3000, () => {
    console.log('Gateway started on port 3000');
});
