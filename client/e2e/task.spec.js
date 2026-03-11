import { test, expect } from '@playwright/test';
import { BASE_URL, getAuthToken, loginWithToken, createProjectViaApi } from './helpers.js';

test.describe('Tasks (UI)', () => {
    test.describe.configure({ mode: 'serial' });

    let authToken;
    let projectId;
    const projectName = `Projet tasks ${Date.now()}`;

    test.beforeAll(async ({ request }) => {
        authToken = await getAuthToken(request, `e2e_task_${Date.now()}`, 'pass123');
        projectId = await createProjectViaApi(request, authToken, projectName);
    });

    test.beforeEach(async ({ page }) => {
        await loginWithToken(page, authToken);
        await page.locator('.card', { hasText: projectName }).click();
        await page.waitForURL(`${BASE_URL}/projects/**`);
        projectId = page.url().split('/').pop();
    });


    test('Affiche l\'état vide', async ({ page }) => {
        await expect(page.getByText('No tasks yet! Add one above!')).toBeVisible();
    });

    test('Créer une tâche et l\'afficher dans la liste', async ({ page }) => {
        const name = `Tâche ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByPlaceholder('Description').fill('Desc tâche');
        await page.getByRole('button', { name: 'Add Task' }).click();

        const row = page.locator('.item', { hasText: name });
        await expect(row).toBeVisible();
        await expect(row.getByText('Desc tâche')).toBeVisible();
    });

    test('Marquer une tâche comme terminée', async ({ page }) => {
        const name = `Tâche done ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByRole('button', { name: 'Add Task' }).click();

        const row = page.locator('.item', { hasText: name });
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Complete task' }).click();

        await expect(row).toHaveClass(/completed/);
        await expect(row.getByRole('button', { name: 'Reopen task' })).toBeVisible();
    });

    test('Rouvrir une tâche terminée', async ({ page }) => {
        const name = `Tâche reopen ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByRole('button', { name: 'Add Task' }).click();

        const row = page.locator('.item', { hasText: name });
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Complete task' }).click();
        await expect(row).toHaveClass(/completed/);

        await row.getByRole('button', { name: 'Reopen task' }).click();
        await expect(row).not.toHaveClass(/completed/);
        await expect(row.getByRole('button', { name: 'Complete task' })).toBeVisible();
    });

    test('Supprimer une tâche', async ({ page }) => {
        const name = `Tâche delete ${Date.now()}`;

        await page.getByPlaceholder('Task name').fill(name);
        await page.getByRole('button', { name: 'Add Task' }).click();

        const row = page.locator('.item', { hasText: name });
        await row.getByRole('button', { name: 'Remove Task' }).click();

        await expect(row).toHaveCount(0);
    });
});