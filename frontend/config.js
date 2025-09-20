// API configuration
export const API_BASE_URL = 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  UPLOAD: `${API_BASE_URL}/upload`,
  STATUS: (jobId) => `${API_BASE_URL}/status/${jobId}`,
  RESULT: (jobId) => `${API_BASE_URL}/result/${jobId}`,
};

// Update with your local IP address when testing with a physical device
// For example: 'http://192.168.1.100:8000'
// Use 'http://localhost:8000' for emulator