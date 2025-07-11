// K6 Performance Thresholds
// Define performance criteria for different test scenarios

export const thresholds = {
  // Auth Service Thresholds
  auth: {
    // 95% of requests should complete within 500ms
    'http_req_duration{scenario:auth_login}': ['p(95)<500'],
    // 99% should complete within 1s
    'http_req_duration{scenario:auth_login}': ['p(99)<1000'],
    // Error rate should be less than 1%
    'http_req_failed{scenario:auth_login}': ['rate<0.01'],
    // Registration should be slower but reliable
    'http_req_duration{scenario:auth_register}': ['p(95)<1000'],
    'http_req_failed{scenario:auth_register}': ['rate<0.01'],
  },

  // Video Service Thresholds  
  video: {
    // API endpoints should be fast
    'http_req_duration{scenario:video_list}': ['p(95)<300'],
    'http_req_duration{scenario:video_detail}': ['p(95)<200'],
    'http_req_failed{scenario:video_api}': ['rate<0.01'],
    // Upload can be slower
    'http_req_duration{scenario:video_upload}': ['p(95)<5000'],
    'http_req_failed{scenario:video_upload}': ['rate<0.05'],
  },

  // Worker Service Thresholds
  worker: {
    // Health checks should be very fast
    'http_req_duration{scenario:worker_health}': ['p(95)<100'],
    'http_req_failed{scenario:worker_health}': ['rate<0.001'],
    // Processing endpoints
    'http_req_duration{scenario:worker_process}': ['p(95)<2000'],
    'http_req_failed{scenario:worker_process}': ['rate<0.02'],
  },

  // Overall System Thresholds
  system: {
    // Overall error rate across all services
    'http_req_failed': ['rate<0.02'],
    // Overall response time
    'http_req_duration': ['p(95)<1000'],
    // Checks should pass
    'checks': ['rate>0.95'],
  }
};

// Load test scenarios configuration
export const scenarios = {
  // Smoke test - minimal load
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  // Load test - expected traffic
  load: {
    executor: 'constant-vus', 
    vus: 10,
    duration: '5m',
  },

  // Stress test - above normal capacity
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 20 },
      { duration: '2m', target: 40 },
      { duration: '5m', target: 40 },
      { duration: '2m', target: 0 },
    ],
  },

  // Spike test - sudden traffic increase  
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '10s', target: 0 },
    ],
  },

  // Soak test - prolonged period
  soak: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30m',
  }
};
