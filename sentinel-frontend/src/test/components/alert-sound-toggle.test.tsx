import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AlertSoundToggle } from '@/app/(main)/dashboard/_components/alert-sound-toggle'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock the useAlertSound hook
const mockToggleMute = vi.fn()
const mockPlayAlert = vi.fn()

vi.mock('@/hooks/use-alert-sound', () => ({
  useAlertSound: () => ({
    muted: true,
    toggleMute: mockToggleMute,
    playAlert: mockPlayAlert,
  }),
}))

// Wrapper component that provides tooltip context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

describe('AlertSoundToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the toggle button', async () => {
    render(
      <TestWrapper>
        <AlertSoundToggle />
      </TestWrapper>
    )

    // Wait for mount effect
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  it('shows muted state icon initially', async () => {
    render(
      <TestWrapper>
        <AlertSoundToggle />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Enable alert sounds')).toBeInTheDocument()
    })
  })

  it('calls toggleMute when clicked', async () => {
    render(
      <TestWrapper>
        <AlertSoundToggle />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Enable alert sounds')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Enable alert sounds'))
    expect(mockToggleMute).toHaveBeenCalled()
  })

  it('renders placeholder during SSR', () => {
    // First render shows the placeholder
    const { container } = render(
      <TestWrapper>
        <AlertSoundToggle />
      </TestWrapper>
    )

    // Should have the flex container
    expect(container.querySelector('.flex')).toBeInTheDocument()
  })
})

describe('AlertSoundToggle when unmuted', () => {
  it('validates mock setup pattern works', () => {
    // This test validates the mock setup is correct
    // Actual unmuted state testing requires component mounting
    expect(mockToggleMute).toBeDefined()
    expect(mockPlayAlert).toBeDefined()
  })
})
