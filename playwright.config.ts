import { defineConfig, devices } from "@playwright/test";

const ahora = new Date();
const dosDigitos = (valor: number) => String(valor).padStart(2, "0");
process.env.E2E_USER_EMAIL ||= `${dosDigitos(ahora.getHours())}${dosDigitos(ahora.getMinutes())}${dosDigitos(ahora.getSeconds())}@${dosDigitos(ahora.getDate())}${dosDigitos(ahora.getMonth() + 1)}.com`;

const testCreacionUsuario = /createUser\.spec\.ts/;
const testEntrenamientoInicial = /newWorkout\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: testCreacionUsuario,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "seed-workout",
      dependencies: ["setup"],
      testMatch: testEntrenamientoInicial,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      dependencies: ["seed-workout"],
      testIgnore: [testCreacionUsuario, testEntrenamientoInicial],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    cwd: "./client",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
