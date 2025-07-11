// Auth Service Load Testing
// Tests login performance under various load conditions

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { getCurrentEnv, headers, testUsers } from '../../config/environments.js';
import { scenarios, thresholds } from '../../config/thresholds.js';

// Custom metrics
export let errorRate = new Rate('errors');

// Test configuration
export let options = {
  scenarios: {
    auth_login_load: {
      ...scenarios.load,
      exec: 'loginLoad',
      tags: { scenario: 'auth_login' },
    },
    auth_login_stress: {
      ...scenarios.stress, 
      exec: 'loginStress',
      tags: { scenario: 'auth_login' },
    }
  },
  thresholds: {
    ...thresholds.auth,
    ...thresholds.system,
  }
};

const env = getCurrentEnv();

// Setup function - runs once before test
export function setup() {
  console.log(`🚀 Starting Auth Load Test against: ${env.authApi}`);
  
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

// Login load test scenario
export function loginLoad(data) {
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
      const body = r.json();
      return body && body.accessToken;
    },
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!loginSuccess);

  if (loginSuccess && loginRes.json()) {
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
        const body = r.json();
        return body && body.id;
      }
    });
  }

  sleep(1); // 1 second between iterations
}

// Stress test scenario
export function loginStress(data) {
  // Similar to loginLoad but with higher intensity
  loginLoad(data);
  sleep(0.5); // Shorter sleep for stress test
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('🏁 Auth Load Test completed');
}
