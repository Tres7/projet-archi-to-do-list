import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

async function createAndLoginUser(request, page, username) {
    await request.post(`${API_URL}/auth/register`, {
        data: { username, password: 'password123' },
    }).catch(() => {});

    const response = await request.post(`${API_URL}/auth/login`, {
        data: { username, password: 'password123' },
    });
    const { token } = await response.json();

    await page.goto(`${BASE_URL}/`);
    await page.evaluate((t) => localStorage.setItem('auth_token', t), token);
    await page.goto(`${BASE_URL}/profile`);
}

test.describe('Profile Page (UI)', () => {
    test.describe.configure({ mode: 'serial' });

    test("Affiche le nom d'utilisateur actuel", async ({ page, request }) => {
        const username = `e2e_profile_${Date.now()}`;
        await createAndLoginUser(request, page, username);

        await expect(page.getByText(username).first()).toBeVisible();
    });

    test("Met à jour le nom d'utilisateur avec succès", async ({ page, request }) => {
        const username = `e2e_update_${Date.now()}`;
        const newUsername = `e2e_updated_${Date.now()}`;
        await createAndLoginUser(request, page, username);

        await page.getByPlaceholder("New username").fill(newUsername);
        await page.getByRole('button', { name: 'Update' }).first().click();

        await expect(page.getByText("Username updated")).toBeVisible();
        await expect(page.getByText(newUsername).first()).toBeVisible();
    });

    test("Affiche une erreur si le nom d'utilisateur est déjà pris", async ({ page, request }) => {
        const takenUsername = `e2e_taken_${Date.now()}`;
        const username = `e2e_taker_${Date.now()}`;

        await request.post(`${API_URL}/auth/register`, {
            data: { username: takenUsername, password: 'password123' },
        });

        await createAndLoginUser(request, page, username);

        await page.getByPlaceholder("New username").fill(takenUsername);
        await page.getByRole('button', { name: 'Update' }).first().click();

        await expect(page.getByText('Username already taken')).toBeVisible();
    });

    test('Change le mot de passe avec succès', async ({ page, request }) => {
        const username = `e2e_pwd_${Date.now()}`;
        await createAndLoginUser(request, page, username);

        await page.getByPlaceholder('New password').fill('newpassword123');
        await page.getByRole('button', { name: 'Update' }).last().click();

        await expect(page.getByText('Password changed')).toBeVisible();
    });

    test('Supprime le compte et redirige vers /auth', async ({ page, request }) => {
        const username = `e2e_delete_${Date.now()}`;
        await createAndLoginUser(request, page, username);

        await page.getByRole('button', { name: 'Delete my account' }).click();
        await page.getByRole('button', { name: 'Confirm delete' }).click();

        await expect(page).toHaveURL(`${BASE_URL}/auth`);
    });
});