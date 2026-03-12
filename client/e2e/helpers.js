export const BASE_URL = 'http://localhost:5173';
export const API_URL = 'http://localhost:3000/api';

export async function getAuthToken(request, username, password) {
    await request
        .post(`${API_URL}/auth/register`, { data: 
            { 
            username, 
            email: `${username}@test.com`,
            password 
            } 
        })
        .catch(() => {});

    const res = await request.post(`${API_URL}/auth/login`, {
        data: { username, password },
    });
    const body = await res.json();
    return body.token;
}

export async function loginWithToken(page, token) {
    await page.goto(`${BASE_URL}/`);
    await page.evaluate((t) => localStorage.setItem('auth_token', t), token);
    await page.goto(`${BASE_URL}/`);
    await page.waitForURL(`${BASE_URL}/projects`);
    await page.waitForLoadState('domcontentloaded');
}

export async function createProjectViaApi(request, token, name, description = '') {
    await request.post(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name, description },
    });
}

export async function createTaskViaApi(request, token, projectId, name, description = '') {
    const res = await request.post(`${API_URL}/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name, description },
    });
    return (await res.json()).id;
}