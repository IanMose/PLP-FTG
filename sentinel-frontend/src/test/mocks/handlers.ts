import { http, HttpResponse } from 'msw'

export const handlers = [
  // ML Admin endpoints
  http.get('/api/proxy/ml/overview', () =>
    HttpResponse.json({
      champion: {
        id: '1',
        version: 'logreg_v1',
        algorithm: 'logistic_regression',
        trainedAt: '2026-09-01T00:00:00Z',
        precisionScore: 0.619,
        recallScore: 0.677,
        f1Score: 0.647,
        status: 'champion',
      },
      challenger: null,
    })
  ),

  http.get('/api/proxy/ml/model-registry', () =>
    HttpResponse.json([
      {
        id: '1',
        version: 'logreg_v1',
        algorithm: 'logistic_regression',
        trainedAt: '2026-09-01T00:00:00Z',
        precisionScore: 0.619,
        recallScore: 0.677,
        f1Score: 0.647,
        status: 'champion',
        artifactPath: 'sentinel/models/logreg_v1.pkl',
      },
    ])
  ),

  http.get('/api/proxy/ml/predictions-for-review', () =>
    HttpResponse.json([
      {
        predictionId: 1,
        siteId: 'site-003',
        probability: 0.82,
        confidenceBand: 'uncertain',
        asOfDate: '2026-09-13',
        existingRating: null,
      },
      {
        predictionId: 2,
        siteId: 'site-001',
        probability: 0.45,
        confidenceBand: 'low',
        asOfDate: '2026-09-13',
        existingRating: null,
      },
    ])
  ),

  http.post('/api/proxy/ml/feedback', () =>
    HttpResponse.json({ id: 'uuid-123', status: 'saved' }, { status: 201 })
  ),

  http.get('/api/proxy/ml/training-runs', () =>
    HttpResponse.json([
      {
        id: 'run-1',
        modelRegistryId: '1',
        triggeredBy: 'manual',
        rowsUsed: 1260,
        feedbackRowsUsed: 25,
        startedAt: '2026-09-01T02:00:00Z',
        completedAt: '2026-09-01T02:05:00Z',
        notes: null,
      },
    ])
  ),

  http.post('/api/proxy/ml/training-run', () =>
    HttpResponse.json(
      { modelRegistryId: 'new-model-id', trainingRunId: 'new-run-id', status: 'saved' },
      { status: 201 }
    )
  ),

  http.patch('/api/proxy/ml/model-registry/:id/promote', () =>
    HttpResponse.json({ status: 'promoted', newChampion: 'promoted-id' })
  ),

  http.patch('/api/proxy/ml/model-registry/:id/reject', () =>
    HttpResponse.json({ status: 'rejected' })
  ),

  http.patch('/api/proxy/ml/model-registry/:id/rollback', () =>
    HttpResponse.json({ status: 'rolled_back', newChampion: 'rollback-id' })
  ),

  // Demo endpoints
  http.post('/api/proxy/demo/trigger-overfill', () =>
    HttpResponse.json({
      message: 'Overfill event seeded for site-003',
      alertId: 'alert-uuid',
      eventId: 'event-uuid',
      actuationId: 'act-uuid',
      slackSent: true,
    })
  ),

  // Executive summary
  http.get('/api/executive/summary', () =>
    HttpResponse.json({
      overfillEventsPrevented: 3,
      estimatedLitresSaved: 15000,
      estimatedKesExposureAvoided: 105000000,
      systemUptimePercent: 99.9,
      lastUpdated: '2026-09-13T10:00:00Z',
      period: 'last_30_days',
    })
  ),

  // CAPAs
  http.get('/api/proxy/capas', () =>
    HttpResponse.json([
      {
        id: 'capa-1',
        description: 'Repair valve at pump station',
        ownerId: 1,
        ownerName: 'John Doe',
        ownerEmail: 'john@sentinel.co.ke',
        status: 'open',
        dueDate: '2026-09-20',
        sourceAlertId: 'alert-1',
      },
    ])
  ),

  http.post('/api/proxy/capas', () =>
    HttpResponse.json(
      { id: 'new-capa-id', status: 'open' },
      { status: 201 }
    )
  ),

  http.get('/api/proxy/capas/:id', ({ params }) =>
    HttpResponse.json({
      id: params.id,
      description: 'Repair valve at pump station',
      ownerId: 1,
      ownerName: 'John Doe',
      ownerEmail: 'john@sentinel.co.ke',
      status: 'open',
      dueDate: '2026-09-20',
      sourceAlertId: 'alert-1',
    })
  ),

  http.patch('/api/proxy/capas/:id/status', () =>
    HttpResponse.json({ id: 'capa-1', status: 'in_progress' })
  ),

  // Technicians
  http.get('/api/proxy/technicians', () =>
    HttpResponse.json([
      { appUserId: 1, name: 'John Doe', qualifications: ['Mechanical', 'Electrical'] },
      { appUserId: 2, name: 'Jane Smith', qualifications: ['Pipeline Integrity'] },
    ])
  ),

  // Hazard reports
  http.post('/api/proxy/hazard-reports', () =>
    HttpResponse.json({ id: 'hazard-1', status: 'submitted' }, { status: 201 })
  ),

  http.patch('/api/proxy/hazard-reports/:id/risk-assessment', () =>
    HttpResponse.json({
      id: 'hazard-1',
      status: 'assessed',
      riskRating: 15,
    })
  ),
]
