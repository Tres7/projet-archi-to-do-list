import { test, expect } from '@playwright/test';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

test.describe('Todo App', () => {
    
    // Nettoyer la base avant chaque test
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/');
    });


    test("Affiche le titre et charge la page", async ({ page }) => {
        await expect(page).toHaveTitle('Todo App');
        await expect(page.getByPlaceholder('New Item')).toBeVisible();
    });

    test("Ajouter un item", async({ page }) => {
        const input = page.getByPlaceholder('New Item');
        
        await input.fill('Acheter des raisins');
        await page.getByRole('button', { name: 'Add Item' }).click();
        
        // Attendre que l'item soit visible
        await expect(page.getByText('Acheter des raisins')).toBeVisible();
        await expect(input).toHaveValue('');
    });

    test("Marquer un item comme terminé", async({ page }) => {
        const input = page.getByPlaceholder('New Item');
        await input.fill('Faire du sport');
        await page.getByRole('button', { name: 'Add Item' }).click();
        await expect(page.getByText('Faire du sport')).toBeVisible();

        // Cibler le bouton dans le contexte de cet item spécifique
        const itemRow = page.locator('.item', { hasText: 'Faire du sport' });
        await itemRow.getByRole('button', { name: 'Mark item as complete' }).click();
        
        await expect(itemRow.getByRole('button', { name: 'Mark item as incomplete' })).toBeVisible();
        await expect(itemRow).toHaveClass(/completed/);
    });

    test("Supprimer un item", async({ page }) => {
        const input = page.getByPlaceholder('New Item');
        await input.fill('Manger italien');
        await page.getByRole('button', { name: 'Add Item' }).click();
        await expect(page.getByText('Manger italien')).toBeVisible();

        const itemRow = page.locator('.item', { hasText: 'Manger italien' });
        await itemRow.getByRole('button', { name: 'Remove Item' }).click();
        await expect(page.getByText('Manger italien')).not.toBeVisible();
    });
});