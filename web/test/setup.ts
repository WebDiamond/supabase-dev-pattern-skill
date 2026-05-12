// src/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
      getUser: vi.fn(), getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(), single: vi.fn(),
      order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    })),
    storage: { from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
    }))},
  },
}))
