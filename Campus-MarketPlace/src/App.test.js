import { render, screen } from '@testing-library/react';
import App from './App';

// Minimal stand-in for the Go backend: every response is JSON, like the real thing.
const jsonResponse = (body, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: () => Promise.resolve(JSON.stringify(body)),
  });

const storedSession = () => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify({ id: 'u1', username: 'danny' }));
};

const originalFetch = global.fetch;

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn((url) => {
    if (String(url).endsWith('/me')) return jsonResponse({ user_id: 'u1', username: 'danny' });
    return jsonResponse([]);
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('shows the sign-in page when nobody is logged in', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('shows the marketplace when a session is stored', async () => {
  storedSession();
  render(<App />);
  expect(screen.getByRole('link', { name: /campus marketplace/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /cart/i })).toBeInTheDocument();
  expect(await screen.findByText(/the market is empty/i)).toBeInTheDocument();
  expect(screen.getByText(/hi, danny/i)).toBeInTheDocument();
});

test('sends the bearer token with authenticated requests', async () => {
  storedSession();
  render(<App />);
  await screen.findByText(/the market is empty/i);
  const [, options] = global.fetch.mock.calls.find(([url]) => String(url).endsWith('/books'));
  expect(options.headers.Authorization).toBe('Bearer test-token');
});

test('drops the session when the server rejects the token', async () => {
  storedSession();
  global.fetch = jest.fn(() => jsonResponse({ error: 'expired' }, 401));
  render(<App />);
  expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});

test('shows a generic message when an error response is not JSON', async () => {
  storedSession();
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 502,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve('<html>Bad gateway</html>'),
    })
  );
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Request failed (502)');
  expect(screen.queryByText(/bad gateway/i)).not.toBeInTheDocument();
});
