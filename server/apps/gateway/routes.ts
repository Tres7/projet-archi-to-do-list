export interface ProxyRouteConfig {
    path: string;
    target: string;
}

export function buildProxyRoutes(): ProxyRouteConfig[] {
    const authServiceUrl =
        process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const projectServiceUrl =
        process.env.PROJECT_SERVICE_URL || 'http://localhost:3002';
    const notificationServiceUrl =
        process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

    return [
        { path: '/api/auth', target: `${authServiceUrl}/auth` },
        { path: '/api/users', target: `${authServiceUrl}/users` },
        { path: '/api/projects', target: `${projectServiceUrl}/projects` },
        {
            path: '/api/notifications',
            target: `${notificationServiceUrl}/notifications`,
        },

        { path: '/api/v1/auth', target: `${authServiceUrl}/v1/auth` },
        { path: '/api/v1/users', target: `${authServiceUrl}/v1/users` },
        { path: '/api/v1/projects', target: `${projectServiceUrl}/projects` },
        {
            path: '/api/v1/notifications',
            target: `${notificationServiceUrl}/notifications`,
        },

        { path: '/api/v2/auth', target: `${authServiceUrl}/v2/auth` },
        { path: '/api/v2/users', target: `${authServiceUrl}/v2/users` },
    ];
}