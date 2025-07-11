// K6 Test Configuration
// Environment settings for different test environments

export const environments = {
  local: {
    authApi: 'http://localhost:3000',
    videoApi: 'http://localhost:3001', 
    workerApi: 'http://localhost:3002',
  },
  staging: {
    authApi: 'https://auth-staging.fiap-hackaton.com',
    videoApi: 'https://video-staging.fiap-hackaton.com',
    workerApi: 'https://worker-staging.fiap-hackaton.com',
  },
  production: {
    authApi: 'https://auth.fiap-hackaton.com',
    videoApi: 'https://video.fiap-hackaton.com', 
    workerApi: 'https://worker.fiap-hackaton.com',
  }
};

// Get current environment (default to local)
export const getCurrentEnv = () => {
  const env = __ENV.ENV || 'local';
  return environments[env];
};

// Test user credentials
export const testUsers = {
  valid: {
    email: 'test@fiap-hackaton.com',
    password: 'TestPassword123!'
  },
  admin: {
    email: 'admin@fiap-hackaton.com', 
    password: 'AdminPassword123!'
  }
};

// Common headers
export const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
