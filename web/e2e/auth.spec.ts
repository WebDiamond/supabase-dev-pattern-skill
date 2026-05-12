// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Autenticazione', () => {
  test('login con credenziali corrette', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Email').fill('test@test.com')
    await page.getByPlaceholder('Password').fill('Password1!')
    await page.getByRole('button', { name: /accedi/i }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('mostra errore con credenziali errate', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Email').fill('wrong@test.com')
    await page.getByPlaceholder('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /accedi/i }).click()
    await expect(page.getByRole('alert')).toContainText('Credenziali non valide')
  })

  test('redirect su route protetta senza auth', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('logout cancella sessione', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Email').fill('test@test.com')
    await page.getByPlaceholder('Password').fill('Password1!')
    await page.getByRole('button', { name: /accedi/i }).click()
    await expect(page).toHaveURL('/dashboard')
    await page.getByRole('button', { name: /esci/i }).click()
    await expect(page).toHaveURL('/login')
  })
})
