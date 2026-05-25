import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
const TOKEN = __ENV.AUTH_TOKEN || '';

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
  },
};

export default function () {
  group('health', () => {
    const res = http.get(`${BASE_URL}/api/health`, params);
    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health body has ok': (r) => r.json('ok') === true,
    });
  });

  sleep(0.5);

  group('dashboard overview', () => {
    const res = http.get(`${BASE_URL}/api/dashboard/overview`, params);
    check(res, {
      'overview status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(0.5);

  group('stocks summary', () => {
    const res = http.get(`${BASE_URL}/api/stocks/summary`, params);
    check(res, {
      'stocks summary status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(1);
}
