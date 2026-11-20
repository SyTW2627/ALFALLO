import { defineConfig, devices } from "@playwright/test";

// Usuario compartido por los tests: lo crea el proyecto "setup" y lo usan los demás.
// Se genera uno nuevo en cada ejecución para no chocar con datos de ejecuciones anteriores.
process.env.E2E_USER_EMAIL ||= `e2e_${Date.now()}@example.com`;

// API contra la que se preparan datos desde los tests (registro rápido, borrado de cuentas).
// Tiene que ser la misma a la que apunta PUBLIC_API_URL en client/.env.
process.env.E2E_API_URL ||= "http://localhost:3000/api";

const testCreacionUsuario = /createUser\.spec\.ts/;
const testEntrenamientoInicial = /newWorkout\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  // Varios tests usan el mismo usuario: se ejecutan uno detrás de otro
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // "list" muestra el resultado en la consola; el informe HTML se genera pero no se abre solo
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
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
  // Playwright arranca el frontend. La API (npm run dev en server) y MongoDB tienen que estar en marcha.
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    cwd: "./client",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});