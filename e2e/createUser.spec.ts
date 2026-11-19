import { test, expect } from '@playwright/test';
import { getTestUserEmail } from './testUser';

test('Creación de un usuario correctamente', async ({ page }) => {
  await page.goto('http://127.0.0.1:4321/');
  await page.getByRole('link', { name: 'Crear cuenta' }).click();
  await page.getByRole('textbox', { name: 'Nombre' }).click();
  await page.getByRole('textbox', { name: 'Nombre' }).fill(getTestUserEmail());
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(getTestUserEmail());
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).click();
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill('12345678');
  await page.getByRole('textbox', { name: 'Repite la contraseña' }).click();
  await page.getByRole('textbox', { name: 'Repite la contraseña' }).fill('12345678');
  await page.getByRole('button', { name: 'Ver' }).click();
  await page.getByRole('button', { name: 'Ocultar' }).click();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.getByRole('link', { name: 'Ir a mi perfil' }).click();
});