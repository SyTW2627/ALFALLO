import { test, expect } from '@playwright/test';
import { getTestUserEmail } from './testUser';

test('Consulta de las estadísticas del usuario', async ({ page }) => {
  await page.goto('http://127.0.0.1:4321/');
  await page.locator('header').getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(getTestUserEmail());
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('12345678');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: 'Estadísticas' }).click();
  await page.getByText('Últimos entrenamientosFuerza1').click();
  await page.getByText('Récords personalesElevaciones').click();
  await page.getByLabel('EjercicioEjercicio “buenos dí').selectOption('6afee0089f084a747940087c');
  await page.locator('section').filter({ hasText: 'Progresión de' }).click();
  await page.getByText('Series por zonaDorsal2Espalda2Lumbar2').click();
  await page.getByText('Volumen por semana05001 mil1,').click();
  await page.getByText('Hoy').click();
  await page.locator('.h-3.w-3.rounded.border').click();
  await expect(page.locator('p').filter({ hasText: /^Entrenamientos$/ })).toBeVisible();
});