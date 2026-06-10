import { test, expect } from '@playwright/test'

test.describe('Página de Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('exibe logotipo da empresa', async ({ page }) => {
    await expect(page.getByText('do campo')).toBeVisible()
    await expect(page.getByText('Alimentos')).toBeVisible()
    await expect(page.getByText('Acesse sua conta')).toBeVisible()
  })

  test('exibe campo de e-mail com tipo e atributo required corretos', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('exibe campo de senha com tipo password e atributo required', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveAttribute('required', '')
  })

  test('botão de mostrar/ocultar senha alterna o tipo do campo', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]')
    const toggleButton = page.locator('button[type="button"]').first()

    await expect(passwordInput).toHaveAttribute('type', 'password')
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('botão Entrar está habilitado inicialmente', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  test('link de Política de Privacidade está presente e aponta para a rota correta', async ({
    page,
  }) => {
    const link = page.getByRole('link', { name: /Política de Privacidade/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/politica-de-privacidade')
  })

  test('digitando nos campos o botão permanece habilitado', async ({ page }) => {
    await page.locator('input[name="email"]').fill('usuario@teste.com')
    await page.locator('input[name="password"]').fill('minhasenha')
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })
})
