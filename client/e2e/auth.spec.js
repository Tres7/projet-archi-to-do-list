import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Auth (UI)', () => {
    test.describe.configure({ mode: 'serial' });

    test('Crée un nouvel utilisateur et redirige vers /', async ({ page }) => {
        const username = `e2e_register_${Date.now()}`;

        await page.goto(`${BASE_URL}/auth`);
        await page.getByRole('tab', { name: 'Register' }).click();

        const pane = page.locator('.tab-pane.active');
        await pane.getByPlaceholder('Enter username').fill(username);
        await pane.getByPlaceholder('Enter password').fill('password123');
        await pane.getByPlaceholder('Confirm password').fill('password123');
        await page.getByRole('button', { name: 'Register' }).click();

        await expect(page).toHaveURL(`${BASE_URL}/`);
        await expect(page.getByPlaceholder('New Item')).toBeVisible();
    });

    test('Login avec identifiants valides et redirige vers /', async ({ page, request }) => {
        const username = `e2e_login_${Date.now()}`;
        await request.post('http://localhost:3000/auth/register', {
            data: { username, password: 'password123' },
        });

        await page.goto(`${BASE_URL}/auth`);

        const pane = page.locator('.tab-pane.active');
        await pane.getByPlaceholder('Enter username').fill(username);
        await pane.getByPlaceholder('Enter password').fill('password123');
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page).toHaveURL(`${BASE_URL}/`);
        await expect(page.getByPlaceholder('New Item')).toBeVisible();
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