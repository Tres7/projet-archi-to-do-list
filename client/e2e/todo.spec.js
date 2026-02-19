import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';
const TEST_USER = { username: 'e2e_test_user', password: 'e2e_test_password_123' };
let authToken = null;

async function loginForTest(request) {
    await request.post(`${API_URL}/auth/register`, {
        data: TEST_USER,
    }).catch(() => {});

    const response = await request.post(`${API_URL}/auth/login`, {
        data: TEST_USER,
    });
    const body = await response.json();
    return body.token;
}

async function openApp(page) {
    await page.goto(`${BASE_URL}/`);

    if (authToken) {
        await page.evaluate((token) => {
            localStorage.setItem('auth_token', token);
        }, authToken);
        await page.goto(`${BASE_URL}/`);
    }
    await expect(page.getByPlaceholder('New Item')).toBeVisible();

    await page.waitForFunction(() => {
        const hasEmptyText = document.body.innerText.includes(
            'No items yet! Add one above!',
        );
        const hasAnyItem = document.querySelectorAll('.item').length > 0;
        return hasEmptyText || hasAnyItem;
    });
}

async function clearAllItems(page) {
    const items = page.locator('.item');

    while ((await items.count()) > 0) {
        const first = items.first();
        await first.getByRole('button', { name: 'Remove Item' }).click();
        await expect(first).toHaveCount(0);
    }

    await expect(items).toHaveCount(0);
}

async function addItem(page, name) {
    const input = page.getByPlaceholder('New Item');
    await input.fill(name);
    await page.getByRole('button', { name: 'Add Item' }).click();

    await expect(input).toHaveValue('');
    await expect(page.locator('.item', { hasText: name })).toHaveCount(1);
}

test.describe('Todo App (UI-only)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({ request }) => {
        authToken = await loginForTest(request);
    });

    test.beforeEach(async ({ page }) => {
        await openApp(page);
        await clearAllItems(page);
    });

    test('Affiche le titre et charge la page', async ({ page }) => {
        await expect(page).toHaveTitle('Todo App');
        await expect(page.getByPlaceholder('New Item')).toBeVisible();
        await expect(page.locator('.item')).toHaveCount(0);
        await expect(
            page.getByText('No items yet! Add one above!'),
        ).toBeVisible();
    });

    test('Ajouter un item (persist après reload)', async ({ page }) => {
        const name = `e2e-Add-${Date.now()}`;

        await addItem(page, name);
        await expect(page.getByText(name)).toBeVisible();

        await openApp(page);
        await expect(page.locator('.item', { hasText: name })).toHaveCount(1);
    });

    test('Marquer un item comme terminé', async ({ page }) => {
        const name = `e2e-Complete-${Date.now()}`;

        await addItem(page, name);

        const row = page.locator('.item', { hasText: name });
        await row
            .getByRole('button', { name: 'Mark item as complete' })
            .click();

        await expect(row).toHaveClass(/completed/);
        await expect(
            row.getByRole('button', { name: 'Mark item as incomplete' }),
        ).toBeVisible();

        await openApp(page);

        const rowAfter = page.locator('.item', { hasText: name });
        await expect(rowAfter).toHaveCount(1);
        await expect(rowAfter).toHaveClass(/completed/);
        await expect(
            rowAfter.getByRole('button', { name: 'Mark item as incomplete' }),
        ).toBeVisible();
    });

    test('Marquer un item comme NON terminé (persist après reload)', async ({
        page,
    }) => {
        const name = `e2e-Incomplete-${Date.now()}`;

        await addItem(page, name);

        const row = page.locator('.item', { hasText: name });
        await row
            .getByRole('button', { name: 'Mark item as complete' })
            .click();
        await expect(row).toHaveClass(/completed/);

        await row
            .getByRole('button', { name: 'Mark item as incomplete' })
            .click();

        await expect(row).not.toHaveClass(/completed/);
        await expect(
            row.getByRole('button', { name: 'Mark item as complete' }),
        ).toBeVisible();

        await openApp(page);

        const rowAfter = page.locator('.item', { hasText: name });
        await expect(rowAfter).toHaveCount(1);
        await expect(rowAfter).not.toHaveClass(/completed/);
        await expect(
            rowAfter.getByRole('button', { name: 'Mark item as complete' }),
        ).toBeVisible();
    });

    test('Supprimer un item', async ({ page }) => {
        const name = `e2e-Remove-${Date.now()}`;

        await addItem(page, name);

        const row = page.locator('.item', { hasText: name });
        await row.getByRole('button', { name: 'Remove Item' }).click();
        await expect(row).toHaveCount(0);

        await openApp(page);
        await expect(page.locator('.item', { hasText: name })).toHaveCount(0);
        await expect(
            page.getByText('No items yet! Add one above!'),
        ).toBeVisible();
    });
});
