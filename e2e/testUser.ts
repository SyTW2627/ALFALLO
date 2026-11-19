export function getTestUserEmail(): string {
  const email = process.env.E2E_USER_EMAIL;
  if (!email) {
    throw new Error("E2E_USER_EMAIL no está definido en la configuración de Playwright.");
  }
  return email;
}
