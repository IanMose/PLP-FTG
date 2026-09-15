import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// The storage key used by the actual hook
const STORAGE_KEY = 'sentinel_alert_sound_muted'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock AudioContext with complete API
const mockResume = vi.fn().mockResolvedValue(undefined)
const mockClose = vi.fn().mockResolvedValue(undefined)
const mockCreateOscillator = vi.fn(() => ({
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { setValueAtTime: vi.fn() },
  type: 'sine',
}))
const mockCreateGain = vi.fn(() => ({
  connect: vi.fn(),
  gain: { 
    setValueAtTime: vi.fn(), 
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
}))

class MockAudioContext {
  state = 'suspended'
  destination = {}
  currentTime = 0
  resume = mockResume
  close = mockClose
  createOscillator = mockCreateOscillator
  createGain = mockCreateGain
}

vi.stubGlobal('AudioContext', MockAudioContext)

describe('useAlertSound hook behavior', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('initializes with muted state from localStorage', async () => {
    localStorageMock.setItem(STORAGE_KEY, 'true')

    // Import hook dynamically to get fresh state
    const { useAlertSound } = await import('@/hooks/use-alert-sound')

    const { result } = renderHook(() => useAlertSound())

    // Should read from localStorage on init
    expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  it('toggles mute state and persists to localStorage', async () => {
    const { useAlertSound } = await import('@/hooks/use-alert-sound')

    const { result } = renderHook(() => useAlertSound())

    act(() => {
      result.current.toggleMute()
    })

    // Should persist to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('playAlert is a function', async () => {
    const { useAlertSound } = await import('@/hooks/use-alert-sound')

    const { result } = renderHook(() => useAlertSound())

    // Just verify the function exists and is callable
    expect(typeof result.current.playAlert).toBe('function')
  })

  it('returns expected shape', async () => {
    const { useAlertSound } = await import('@/hooks/use-alert-sound')

    const { result } = renderHook(() => useAlertSound())

    // Verify hook returns the expected properties
    expect(result.current).toHaveProperty('muted')
    expect(result.current).toHaveProperty('toggleMute')
    expect(result.current).toHaveProperty('playAlert')
    expect(typeof result.current.muted).toBe('boolean')
    expect(typeof result.current.toggleMute).toBe('function')
    expect(typeof result.current.playAlert).toBe('function')
  })
})
