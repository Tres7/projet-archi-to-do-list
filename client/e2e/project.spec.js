import { test, expect } from '@playwright/test';
import { BASE_URL, getAuthToken, loginWithToken } from './helpers.js';

test.describe('Projects (UI)', () => {
    test.describe.configure({ mode: 'serial' });

    let authToken;

    test.beforeAll(async ({ request }) => {
        authToken = await getAuthToken(request, `e2e_proj_${Date.now()}`, 'pass123');
    });

    test.beforeEach(async ({ page }) => {
        await loginWithToken(page, authToken);
    });

    test('Affiche l\'état vide', async ({ page }) => {
        await expect(page.getByText('No projects yet! You can add one!')).toBeVisible();
    });

    test('Créer un projet et l\'afficher dans la liste', async ({ page }) => {
        const name = `Projet ${Date.now()}`;

        await page.getByPlaceholder('Project name').fill(name);
        await page.getByPlaceholder('Description').fill('Une description');
        await page.getByRole('button', { name: 'Add Project' }).click();

        const card = page.locator('.card', { hasText: name });
        await expect(card).toBeVisible();
        await expect(card.getByText('OPEN')).toBeVisible();
        await expect(card.getByText('0 task(s) remaining')).toBeVisible();
    });

    test('Cliquer sur un projet navigue vers la page de détail', async ({ page }) => {
        const name = `Projet nav ${Date.now()}`;

        await page.getByPlaceholder('Project name').fill(name);
        await page.getByRole('button', { name: 'Add Project' }).click();

        await page.locator('.card', { hasText: name }).click();

        await expect(page).toHaveURL(/\/projects\/.+/);
        await expect(page.getByRole('heading', { name })).toBeVisible();
    });

    test('Supprimer un projet le retire de la liste', async ({ page }) => {
        const name = `Projet delete ${Date.now()}`;

        await page.getByPlaceholder('Project name').fill(name);
        await page.getByRole('button', { name: 'Add Project' }).click();

        const card = page.locator('.card', { hasText: name });
        await expect(card).toBeVisible();

        await card.getByRole('button', { name: 'X' }).click();

        await expect(card).not.toBeVisible();
    });

});