import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DemoTriggerButton } from '@/app/(main)/dashboard/executive/_components/demo-trigger-button'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'

describe('DemoTriggerButton', () => {
  beforeEach(() => {
    // Reset any runtime handlers
    server.resetHandlers()
  })

  it('renders the trigger button', () => {
    render(<DemoTriggerButton />)
    expect(screen.getByText('Trigger Demo')).toBeInTheDocument()
  })

  it('opens dialog when clicked', () => {
    render(<DemoTriggerButton />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    expect(screen.getByText('Live Demo: Overfill Detection')).toBeInTheDocument()
  })

  it('displays both demo options in dialog', () => {
    render(<DemoTriggerButton />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    expect(screen.getByText('Standard Demo (96.5%)')).toBeInTheDocument()
    expect(screen.getByText('Critical Demo (98.7%)')).toBeInTheDocument()
  })

  it('shows loading state during demo execution', async () => {
    // Add a delay to the handler to test loading state
    server.use(
      http.post('*/api/demo/trigger-overfill', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          success: true,
          message: 'Demo completed',
          eventId: 'EVT-123',
          actuationId: 'ACT-123',
          steps: [],
          totalTimeMs: 150,
        })
      })
    )

    render(<DemoTriggerButton />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    fireEvent.click(screen.getByText('Standard Demo (96.5%)'))

    expect(screen.getByText('Running demo sequence...')).toBeInTheDocument()
  })

  it('displays success result after demo completes', async () => {
    server.use(
      http.post('*/api/demo/trigger-overfill', () => {
        return HttpResponse.json({
          success: true,
          message: 'Demo completed successfully',
          eventId: 'EVT-123',
          actuationId: 'ACT-123',
          steps: [
            { stepNumber: 1, action: 'Telemetry Ingested', detail: 'Tank reading', elapsedMs: 10 },
            { stepNumber: 2, action: 'Overfill Detected', detail: 'ML detected', elapsedMs: 20 },
          ],
          totalTimeMs: 150,
        })
      })
    )

    render(<DemoTriggerButton />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    fireEvent.click(screen.getByText('Standard Demo (96.5%)'))

    await waitFor(() => {
      expect(screen.getByText('Demo Completed Successfully!')).toBeInTheDocument()
    })

    expect(screen.getByText('Execution Timeline')).toBeInTheDocument()
    expect(screen.getByText('Telemetry Ingested')).toBeInTheDocument()
  })

  it('displays error state when demo fails', async () => {
    server.use(
      http.post('*/api/demo/trigger-overfill', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    render(<DemoTriggerButton />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    fireEvent.click(screen.getByText('Standard Demo (96.5%)'))

    await waitFor(() => {
      expect(screen.getByText('Demo Failed')).toBeInTheDocument()
    })
  })

  it('calls onDemoComplete callback after successful demo', async () => {
    const onDemoComplete = vi.fn()

    server.use(
      http.post('*/api/demo/trigger-overfill', () => {
        return HttpResponse.json({
          success: true,
          message: 'Demo completed',
          eventId: 'EVT-123',
          actuationId: 'ACT-123',
          steps: [],
          totalTimeMs: 150,
        })
      })
    )

    render(<DemoTriggerButton onDemoComplete={onDemoComplete} />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    fireEvent.click(screen.getByText('Standard Demo (96.5%)'))

    await waitFor(() => {
      expect(onDemoComplete).toHaveBeenCalled()
    })
  })

  it('closes dialog when close button is clicked', async () => {
    server.use(
      http.post('*/api/demo/trigger-overfill', () => {
        return HttpResponse.json({
          success: true,
          message: 'Demo completed',
          eventId: null,
          actuationId: null,
          steps: [],
          totalTimeMs: 100,
        })
      })
    )

    render(<DemoTriggerButton />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    fireEvent.click(screen.getByText('Standard Demo (96.5%)'))

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Close'))

    await waitFor(() => {
      expect(screen.queryByText('Live Demo: Overfill Detection')).not.toBeInTheDocument()
    })
  })

  it('triggers critical demo correctly', async () => {
    const criticalHandler = vi.fn()

    server.use(
      http.post('*/api/demo/trigger-critical', () => {
        criticalHandler()
        return HttpResponse.json({
          success: true,
          message: 'Critical demo completed',
          eventId: 'EVT-CRIT',
          actuationId: 'ACT-CRIT',
          steps: [],
          totalTimeMs: 200,
        })
      })
    )

    render(<DemoTriggerButton />)
    fireEvent.click(screen.getByText('Trigger Demo'))
    fireEvent.click(screen.getByText('Critical Demo (98.7%)'))

    await waitFor(() => {
      expect(criticalHandler).toHaveBeenCalled()
    })
  })
})
