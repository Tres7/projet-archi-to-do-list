import { test, expect } from '@playwright/test';
import { BASE_URL, API_URL } from './helpers.js';

test.describe('Auth (UI)', () => {
    test.describe.configure({ mode: 'serial' });

    test('Crée un nouvel utilisateur et redirige vers /projects', async ({ page }) => {
        const username = `e2e_register_${Date.now()}`;

        await page.goto(`${BASE_URL}/auth`);
        await page.getByRole('tab', { name: 'Register' }).click();

        const pane = page.locator('.tab-pane.active');
        await pane.getByPlaceholder('Enter email').fill(`${username}@test.com`);
        await pane.getByPlaceholder('Enter username').fill(username);
        await pane.getByPlaceholder('Enter password').fill('password123');
        await pane.getByPlaceholder('Confirm password').fill('password123');
        await page.getByRole('button', { name: 'Register' }).click();

        await expect(page).toHaveURL(`${BASE_URL}/projects`);
        await expect(page.getByPlaceholder('Project name')).toBeVisible();
        await expect(page.getByText(username)).toBeVisible();
    });

    test('Login avec identifiants valides et redirige vers /projects', async ({ page, request }) => {
        const username = `e2e_login_${Date.now()}`;
        await request.post(`${API_URL}/auth/register`, {
            data: 
            { 
                username, 
                email: `${username}@test.com`,
                password: 'password123' },
        });

        await page.goto(`${BASE_URL}/auth`);
        const pane = page.locator('.tab-pane.active');
        await pane.getByPlaceholder('Enter username').fill(username);
        await pane.getByPlaceholder('Enter password').fill('password123');
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page).toHaveURL(`${BASE_URL}/projects`);
        await expect(page.getByPlaceholder('Project name')).toBeVisible();
        await expect(page.getByText(username)).toBeVisible();
    });

    test('Login avec identifiants invalides affiche une erreur', async ({ page }) => {
        await page.goto(`${BASE_URL}/auth`);

        const pane = page.locator('.tab-pane.active');
        await pane.getByPlaceholder('Enter username').fill('wrong_user');
        await pane.getByPlaceholder('Enter password').fill('wrong_password');
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByRole('alert')).toHaveText('Invalid username or password');
        await expect(page).toHaveURL(`${BASE_URL}/auth`);
    });

    test('Redirige vers /auth si non connecté', async ({ page }) => {
        await page.goto(`${BASE_URL}/`);
        await expect(page).toHaveURL(`${BASE_URL}/auth`);
        await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible();
    });
});
