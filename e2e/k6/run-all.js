// K6 Test Runner - Execute all performance tests
// Usage: k6 run run-all.js

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { check, sleep } from 'k6';
import http from 'k6/http';
import { getCurrentEnv, headers, testUsers } from './config/environments.js';

// Global setup function
export function setup() {
  const env = getCurrentEnv();
  
  console.log('🚀 Starting FIAP Hackaton Performance Test Suite');
  console.log(`📡 Testing against: ${env.authApi}`);
  console.log('📊 Running comprehensive load tests...');
  console.log('📁 Reports will be saved to ./reports/');
  
  // Health check
  const healthRes = http.get(`${env.authApi}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Auth service health check failed: ${healthRes.status}`);
  }
  
  // Ensure test user exists
  const registerPayload = {
    email: testUsers.valid.email,
    password: testUsers.valid.password,
    name: 'Test User'
  };
  
  // Try to register the test user (ignore if already exists)
  http.post(
    `${env.authApi}/auth/register`,
    JSON.stringify(registerPayload),
    { headers }
  );
  
  return { env };
}

export const options = {
  scenarios: {
    // Auth service tests
    auth_load_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      exec: 'authTest',
      tags: { service: 'auth' },
    },

    // TODO: Add video and worker tests tomorrow
    // video_load_test: { ... },
    // worker_load_test: { ... },
  },

  thresholds: {
    // Overall system thresholds
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.02'],
    'checks': ['rate>0.95'],
  }
};

// Auth test execution
export function authTest(data) {
  const loginPayload = {
    email: testUsers.valid.email,
    password: testUsers.valid.password
  };

  // Perform login
  const loginRes = http.post(
    `${data.env.authApi}/auth/signin`,
    JSON.stringify(loginPayload),
    { headers }
  );

  // Validate response
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = r.json();
        return body && body.accessToken;
      } catch (e) {
        return false;
      }
    },
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (loginSuccess && loginRes.status === 200) {
    try {
      const token = loginRes.json().accessToken;
      
      // Test token validation
      const profileRes = http.get(
        `${data.env.authApi}/auth/me`,
        {
          headers: {
            ...headers,
            'Authorization': `Bearer ${token}`
          }
        }
      );

      check(profileRes, {
        'profile status is 200': (r) => r.status === 200,
        'profile has user data': (r) => {
          try {
            const body = r.json();
            return body && body.id;
          } catch (e) {
            return false;
          }
        }
      });
    } catch (e) {
      // Handle JSON parsing errors gracefully
    }
  }

  sleep(1); // 1 second between iterations
}

// Generate comprehensive test report
export function handleSummary (data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    [`reports/k6-report-${timestamp}.html`]: htmlReport(data),
    [`reports/k6-summary-${timestamp}.txt`]: textSummary(data, { indent: ' ', enableColors: true }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Teardown function  
export function teardown (data) {
  const duration = new Date() - data.startTime;
  console.log(`🏁 Performance test suite completed in ${Math.round(duration / 1000)}s`);
  console.log('📋 Check the reports/ directory for detailed results');
}
