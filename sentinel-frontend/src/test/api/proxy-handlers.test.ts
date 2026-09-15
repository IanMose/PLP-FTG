import { describe, it, expect, vi, beforeEach } from 'vitest'

// Note: Testing Next.js Route Handlers in unit tests is limited because
// they require the Next.js runtime environment. These tests validate
// the MSW handlers that mock the API responses.

describe('MSW API Mock Handlers', () => {
  it('model-registry handler returns correct structure', async () => {
    const response = await fetch('/api/proxy/ml/model-registry')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('version')
    expect(data[0]).toHaveProperty('status')
    expect(data[0]).toHaveProperty('precisionScore')
    expect(data[0]).toHaveProperty('recallScore')
    expect(data[0]).toHaveProperty('f1Score')
  })

  it('predictions-for-review handler returns predictions', async () => {
    const response = await fetch('/api/proxy/ml/predictions-for-review')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('predictionId')
    expect(data[0]).toHaveProperty('siteId')
    expect(data[0]).toHaveProperty('probability')
    expect(data[0]).toHaveProperty('confidenceBand')
  })

  it('feedback handler accepts POST', async () => {
    const response = await fetch('/api/proxy/ml/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        predictionId: 1,
        rating: 'agree',
        reviewerNotes: 'Looks correct',
      }),
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('status', 'saved')
  })

  it('training-runs handler returns run history', async () => {
    const response = await fetch('/api/proxy/ml/training-runs')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('triggeredBy')
    expect(data[0]).toHaveProperty('rowsUsed')
  })

  it('training-run POST creates new run', async () => {
    const response = await fetch('/api/proxy/ml/training-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        triggeredBy: 'manual',
      }),
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty('modelRegistryId')
    expect(data).toHaveProperty('trainingRunId')
  })

  it('promote endpoint updates model status', async () => {
    const response = await fetch('/api/proxy/ml/model-registry/test-id/promote', {
      method: 'PATCH',
    })
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveProperty('status', 'promoted')
  })

  it('reject endpoint updates model status', async () => {
    const response = await fetch('/api/proxy/ml/model-registry/test-id/reject', {
      method: 'PATCH',
    })
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveProperty('status', 'rejected')
  })

  it('rollback endpoint reverts champion', async () => {
    const response = await fetch('/api/proxy/ml/model-registry/test-id/rollback', {
      method: 'PATCH',
    })
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveProperty('status', 'rolled_back')
  })
})

describe('Demo API Mock Handlers', () => {
  it('trigger-overfill returns demo result', async () => {
    const response = await fetch('/api/proxy/demo/trigger-overfill', {
      method: 'POST',
    })
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveProperty('message')
    expect(data).toHaveProperty('alertId')
    expect(data).toHaveProperty('eventId')
    expect(data).toHaveProperty('actuationId')
    expect(data).toHaveProperty('slackSent')
  })
})

describe('CAPA API Mock Handlers', () => {
  it('GET capas returns list', async () => {
    const response = await fetch('/api/proxy/capas')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('description')
    expect(data[0]).toHaveProperty('status')
  })

  it('POST capa creates new record', async () => {
    const response = await fetch('/api/proxy/capas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Test CAPA',
        ownerId: 1,
        dueDate: '2026-10-01',
      }),
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('status', 'open')
  })

  it('PATCH capa status updates record', async () => {
    const response = await fetch('/api/proxy/capas/capa-1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveProperty('status', 'in_progress')
  })
})

describe('Hazard Report API Mock Handlers', () => {
  it('POST hazard report creates record', async () => {
    const response = await fetch('/api/proxy/hazard-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: 'site-001',
        description: 'Potential leak detected',
        reportedBy: 1,
      }),
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('status', 'submitted')
  })

  it('PATCH risk assessment updates hazard', async () => {
    const response = await fetch('/api/proxy/hazard-reports/hazard-1/risk-assessment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        likelihood: 3,
        consequence: 5,
      }),
    })
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveProperty('status', 'assessed')
    expect(data).toHaveProperty('riskRating')
  })
})

describe('Executive API Mock Handlers', () => {
  it('GET summary returns KPIs', async () => {
    const response = await fetch('/api/executive/summary')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveProperty('overfillEventsPrevented')
    expect(data).toHaveProperty('estimatedLitresSaved')
    expect(data).toHaveProperty('estimatedKesExposureAvoided')
    expect(data).toHaveProperty('systemUptimePercent')
  })
})
