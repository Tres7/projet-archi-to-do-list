import { test, expect } from '@playwright/test';
import { BASE_URL, getAuthToken, loginWithToken, createProjectViaApi, createTaskViaApi } from './helpers.js';

test.describe('Notifications (UI)', () => {
    test.describe.configure({ mode: 'serial' });

    let authToken;
    let projectId;
    const projectName = `Projet notif ${Date.now()}`;

    test.beforeAll(async ({ request }) => {
        authToken = await getAuthToken(request, `e2e_notif_${Date.now()}`, 'pass123');
        projectId = await createProjectViaApi(request, authToken, projectName);
    });

    test.beforeEach(async ({ page }) => {
        await loginWithToken(page, authToken);
        await page.locator('.card', { hasText: projectName }).click();
        await page.waitForURL(`${BASE_URL}/projects/**`);
        projectId = page.url().split('/').pop();
    });

    test('La cloche reçoit une notification après création d\'un projet', async ({ page }) => {
        const name = `Projet notif create ${Date.now()}`;

        await page.goto(`${BASE_URL}/projects`);
        await page.getByPlaceholder('Project name').fill(name);
        await page.getByRole('button', { name: 'Add Project' }).click();

        await expect(page.locator('.card', { hasText: name })).toBeVisible();

        const bell = page.locator('.fa-bell').locator('..');
        await expect(bell.locator('.badge')).toBeVisible({ timeout: 15000 });
    });


    test('La cloche reçoit une notification après création d\'une tâche', async ({ page }) => {
        const name = `Tâche notif ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByRole('button', { name: 'Add Task' }).click();
        await expect(page.locator('.item', { hasText: name })).toBeVisible();

        const bell = page.locator('.fa-bell').locator('..');
        await expect(bell.locator('.badge')).toBeVisible({ timeout: 15000 });
    });


    test('La cloche reçoit une notification après complétion d\'une tâche', async ({ page }) => {
        const taskName = `Tâche toggle ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(taskName);
        await page.getByRole('button', { name: 'Add Task' }).click();

        const row = page.locator('.item', { hasText: taskName });
        await expect(row).toBeVisible();

        await row.getByRole('button', { name: 'Complete task' }).click();
        await expect(row.getByRole('button', { name: 'Reopen task' })).toBeVisible({ timeout: 15000 });

        const bell = page.locator('.fa-bell').locator('..');
        const badge = bell.locator('.badge');
        await expect(badge).toBeVisible({ timeout: 5000 });
        expect(parseInt(await badge.textContent(), 10)).toBeGreaterThanOrEqual(1);
    });

    test('La cloche reçoit une notification après fermeture d\'un projet', async ({ page }) => {
        const name = `Projet notif close ${Date.now()}`;

        await page.goto(`${BASE_URL}/projects`);
        await page.getByPlaceholder('Project name').fill(name);
        await page.getByRole('button', { name: 'Add Project' }).click();

        const card = page.locator('.card', { hasText: name });
        await expect(card).toBeVisible();
        await card.click();
        await page.waitForURL(`${BASE_URL}/projects/**`);

        await page.getByRole('button', { name: 'Close Project' }).click();

        const bell = page.locator('.fa-bell').locator('..');
        await expect(bell.locator('.badge')).toBeVisible({ timeout: 15000 });
    });

    test('La cloche reçoit une notification après suppression d\'une tâche', async ({ page }) => {
        const name = `Tâche notif delete ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByRole('button', { name: 'Add Task' }).click();

        const row = page.locator('.item', { hasText: name });
        await expect(row).toBeVisible();

        await row.getByRole('button', { name: 'Remove Task' }).click();
        await expect(row).toHaveCount(0);

        const bell = page.locator('.fa-bell').locator('..');
        await expect(bell.locator('.badge')).toBeVisible({ timeout: 15000 });
    });

    test('La cloche reçoit une notification après suppression d\'un projet', async ({ page }) => {
        const name = `Projet notif delete ${Date.now()}`;

        await page.goto(`${BASE_URL}/projects`);
        await page.getByPlaceholder('Project name').fill(name);
        await page.getByRole('button', { name: 'Add Project' }).click();

        const card = page.locator('.card', { hasText: name });
        await expect(card).toBeVisible();

        await card.getByRole('button', { name: 'X' }).click();
        await expect(card).not.toBeVisible();

        const bell = page.locator('.fa-bell').locator('..');
        await expect(bell.locator('.badge')).toBeVisible({ timeout: 15000 });
    });


    test('Ouvrir la cloche affiche les notifications', async ({ page }) => {
        const name = `Tâche bell ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByRole('button', { name: 'Add Task' }).click();

        const bell = page.locator('.fa-bell').locator('..');
        await expect(bell.locator('.badge')).toBeVisible({ timeout: 5000 });

        await bell.click();

        const menu = page.locator('.dropdown-menu');
        await expect(menu).toBeVisible();
        await expect(menu.locator('.dropdown-item:not([disabled])').first()).toBeVisible();
    });

    test('Supprimer toutes les notifications', async ({ page }) => {
        const name = `Tâche clear ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByRole('button', { name: 'Add Task' }).click();

        const bell = page.locator('.fa-bell').locator('..');
        await expect(bell.locator('.badge')).toBeVisible({ timeout: 5000 });
        await bell.click();

        await page.getByRole('button', { name: 'Delete all' }).click();

        await expect(page.getByText('Aucune notification')).toBeVisible();
        await expect(bell.locator('.badge')).not.toBeVisible();
    });
});
