import { test, expect } from '@playwright/test';
import { getTestUserEmail } from './testUser';

test('Creación de una rutina nueva', async ({ page }) => {
  await page.goto('http://127.0.0.1:4321/');
  await page.locator('header').getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(getTestUserEmail());
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('12345678');
  await page.getByRole('textbox', { name: 'Contraseña' }).press('Enter');
  await page.getByRole('link', { name: 'Entrenar' }).click();
  await page.getByRole('link', { name: 'Ir a rutinas' }).click();
  await page.getByRole('button', { name: 'Crear mi primera rutina' }).click();
  await page.getByRole('textbox', { name: 'Nombre de la rutina' }).click();
  await page.getByRole('textbox', { name: 'Nombre de la rutina' }).fill('Rutina 1');
  await page.getByRole('button', { name: 'Resistencia 15–30 reps · 2–4' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await page.getByRole('button', { name: 'Pecho', exact: true }).click();
  await page.getByRole('button', { name: 'Aperturas en máquina Peck' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await page.getByRole('button', { name: 'Tríceps', exact: true }).click();
  await page.getByRole('button', { name: 'Extensión de tríceps con cable a una mano Tríceps · Dificultad 1/5 Añadir' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await page.getByRole('button', { name: 'Hombro lateral', exact: true }).click();
  await page.getByRole('button', { name: 'Elevación lateral con mancuernas Hombro lateral · Dificultad 2/5 Añadir' }).click();
  await page.getByRole('listitem').filter({ hasText: '2Extensión de tríceps con' }).getByLabel('Bajar series').click();
  await page.getByRole('listitem').filter({ hasText: '3Elevación lateral con' }).getByLabel('Subir series').click();
  await page.getByRole('listitem').filter({ hasText: '2Extensión de tríceps con' }).getByLabel('Subir reps').click();
  await page.getByRole('listitem').filter({ hasText: '2Extensión de tríceps con' }).getByLabel('Subir reps').click({
    clickCount: 3
  });
  await page.getByRole('listitem').filter({ hasText: '2Extensión de tríceps con' }).getByLabel('Subir reps').click({
    clickCount: 3
  });
  await page.getByRole('listitem').filter({ hasText: '2Extensión de tríceps con' }).getByLabel('Subir reps').click({
    clickCount: 3
  });
  await page.getByRole('listitem').filter({ hasText: '1Aperturas en máquina Peck' }).getByLabel('Bajar reps').click({
    clickCount: 3
  });
  await page.getByRole('listitem').filter({ hasText: '1Aperturas en máquina Peck' }).getByLabel('Bajar reps').dblclick();
  await page.getByRole('button', { name: '+ Añadir día' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(1).click();
  await page.getByRole('button', { name: 'Espalda', exact: true }).click();
  await page.getByRole('button', { name: 'Remo con mancuerna a una mano' }).click();
  await page.getByRole('listitem').filter({ hasText: '1Remo con mancuerna a una' }).getByLabel('Subir reps').dblclick();
  await page.getByRole('listitem').filter({ hasText: '1Remo con mancuerna a una' }).getByLabel('Subir reps').click();
  await page.getByRole('listitem').filter({ hasText: '1Remo con mancuerna a una' }).getByLabel('Bajar reps').click({
    clickCount: 3
  });
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(1).click();
  await page.getByRole('searchbox', { name: 'Buscar ejercicio' }).click();
  await page.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('curl alterno');
  await page.getByRole('button', { name: 'Curl alterno con mancuernas B' }).click();
  await page.getByRole('listitem').filter({ hasText: '2Curl alterno con mancuernasB' }).getByLabel('Subir reps').click({
    clickCount: 3
  });
  await page.getByRole('listitem').filter({ hasText: '2Curl alterno con mancuernasB' }).getByLabel('Subir reps').dblclick();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(1).click();
  await page.getByRole('button', { name: 'Hombro posterior', exact: true }).click();
  await page.getByRole('button', { name: 'Elevaciones posteriores para' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(1).click();
  await page.getByRole('button', { name: 'Hombro frontal', exact: true }).click();
  await page.getByRole('button', { name: 'Elevación frontal con mancuerna a dos manos Hombro frontal · Dificultad 1/5 Añ' }).click();
  await page.getByRole('button', { name: '+ Añadir día' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(2).click();
  await page.getByRole('button', { name: 'Glúteo', exact: true }).click();
  await page.getByRole('button', { name: 'Columpios con kettlebell Glú' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(2).click();
  await page.getByRole('button', { name: 'Abductores', exact: true }).click();
  await page.getByRole('button', { name: 'Abducciones de cadera sentado' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(2).click();
  await page.getByRole('button', { name: 'Abdominal', exact: true }).click();
  await page.getByRole('button', { name: 'Crunch Abdominal · Dificultad' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(2).click();
  await page.getByRole('button', { name: 'Cerrar buscador' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(2).click();
  await page.getByRole('button', { name: 'Cuádriceps', exact: true }).click();
  await page.getByRole('button', { name: '1.5 repeticiones de' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(1).click();
  await page.getByRole('button', { name: 'Dorsal', exact: true }).click();
  await page.getByRole('button', { name: 'Elevaciones en barra fija con' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).nth(1).click();
  await page.getByRole('button', { name: 'Lumbar', exact: true }).click();
  await page.getByRole('button', { name: 'Ejercicio Superman en' }).click();
  await page.getByRole('button', { name: 'Crear rutina' }).click();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('listitem').filter({ hasText: '1Remo con mancuerna a una' }).getByLabel('Subir descanso').click();
  await page.getByRole('listitem').filter({ hasText: '2Curl alterno con mancuernasB' }).getByLabel('Subir descanso').click();
  await page.getByRole('listitem').filter({ hasText: '3Elevaciones posteriores para' }).getByLabel('Subir descanso').click();
  await page.locator('li:nth-child(5) > .mt-3 > div:nth-child(3) > .mt-1 > .grid.h-full.w-8.shrink-0.place-items-center.rounded-l-lg').click();
  await page.locator('li:nth-child(6) > .mt-3 > div:nth-child(3) > .mt-1 > .grid.h-full.w-8.shrink-0.place-items-center.rounded-l-lg').click();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
});