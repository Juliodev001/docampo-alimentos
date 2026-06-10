import { test, expect } from '@playwright/test'

test.describe('Proteção de rotas — redirecionamento sem sessão', () => {
  test('/ sem sessão redireciona para /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('/login sem sessão exibe formulário sem redirecionar', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('/pedidos sem sessão redireciona para /login', async ({ page }) => {
    await page.goto('/pedidos')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/produtos sem sessão redireciona para /login', async ({ page }) => {
    await page.goto('/produtos')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/produtores sem sessão redireciona para /login', async ({ page }) => {
    await page.goto('/produtores')
    await expect(page).toHaveURL(/\/login/)
  })
})
