import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

const gatewayPort = process.env.GATEWAY_PORT || 3000;
// const authPort = process.env.AUTH_PORT || 3001;
// const usersPort = process.env.USERS_PORT || 3001;
// const projectsPort = process.env.PROJECTS_PORT || 3002;
// const notificationsPort = process.env.NOTIFICATIONS_PORT || 3004;

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const projectServiceUrl =
    process.env.PROJECT_SERVICE_URL || 'http://localhost:3002';
// const taskServiceUrl = process.env.TASK_SERVICE_URL || 'http://localhost:3003';
const notificationServiceUrl =
    process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const app = express();

app.use(express.json());

const authProxy = createProxyMiddleware({
    target: `${authServiceUrl}/auth`,
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

const usersProxy = createProxyMiddleware({
    target: `${authServiceUrl}/users`,
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

const projectProxy = createProxyMiddleware({
    target: `${projectServiceUrl}/projects`,
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

const notificationsProxy = createProxyMiddleware({
    target: `${notificationServiceUrl}/notifications`,
    changeOrigin: true,
    logger: console,
    on: {
        proxyReq: fixRequestBody,
    },
});

app.use('/api/auth', authProxy);
app.use('/api/users', usersProxy);
app.use('/api/projects', projectProxy);
app.use('/api/notifications', notificationsProxy);

app.use((_req, res) => {
    console.warn(`No route matched for ${_req.method} ${_req.originalUrl}`);
    res.status(404).json({
        message: 'Route not found in API Gateway',
    });
});

app.listen(gatewayPort, () => {
    console.log(`Gateway started on port ${gatewayPort}`);
});
