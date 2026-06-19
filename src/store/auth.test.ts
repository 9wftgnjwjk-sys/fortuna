import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from './auth'
import type { User, Session } from '@supabase/supabase-js'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

const mockUser = { id: 'user-1', email: 'test@example.com' } as User
const mockSession = { user: mockUser, access_token: 'tok' } as Session

function resetStore() {
  useAuthStore.setState({ user: null, session: null, loading: true })
}

describe('useAuthStore', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has null user by default', () => {
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('has null session by default', () => {
      expect(useAuthStore.getState().session).toBeNull()
    })

    it('has loading=true by default', () => {
      expect(useAuthStore.getState().loading).toBe(true)
    })
  })

  describe('setUser', () => {
    it('sets user', () => {
      useAuthStore.getState().setUser(mockUser)
      expect(useAuthStore.getState().user).toBe(mockUser)
    })

    it('clears user when called with null', () => {
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.getState().setUser(null)
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('setSession', () => {
    it('sets session and extracts user from it', () => {
      useAuthStore.getState().setSession(mockSession)

      expect(useAuthStore.getState().session).toBe(mockSession)
      expect(useAuthStore.getState().user).toBe(mockUser)
    })

    it('clears user when session is set to null', () => {
      useAuthStore.getState().setSession(mockSession)
      useAuthStore.getState().setSession(null)

      expect(useAuthStore.getState().session).toBeNull()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('setLoading', () => {
    it('sets loading to false', () => {
      useAuthStore.getState().setLoading(false)
      expect(useAuthStore.getState().loading).toBe(false)
    })

    it('sets loading to true', () => {
      useAuthStore.setState({ loading: false })
      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().loading).toBe(true)
    })
  })

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      const { supabase } = await import('@/lib/supabase')
      await useAuthStore.getState().signOut()
      expect(supabase.auth.signOut).toHaveBeenCalledOnce()
    })

    it('clears user and session after sign out', async () => {
      useAuthStore.getState().setSession(mockSession)
      await useAuthStore.getState().signOut()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().session).toBeNull()
    })
  })
})
