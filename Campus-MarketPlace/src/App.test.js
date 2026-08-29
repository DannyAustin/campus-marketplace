import { render, screen, fireEvent } from '@testing-library/react';
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
  window.history.replaceState({}, '', '/');
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
  expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('shows the marketplace when a session is stored', async () => {
  storedSession();
  render(<App />);
  expect(screen.getByRole('link', { name: /campus marketplace/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /cart/i })).toBeInTheDocument();
  expect(await screen.findByText(/the market is empty/i)).toBeInTheDocument();
  expect(screen.getByTitle(/signed in as danny/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
});

test('sends the bearer token with authenticated requests', async () => {
  storedSession();
  render(<App />);
  await screen.findByText(/the market is empty/i);
  const [, options] = global.fetch.mock.calls.find(([url]) => String(url).includes('/listings'));
  expect(options.headers.Authorization).toBe('Bearer test-token');
});

test('passes URL filters through to the listings API', async () => {
  storedSession();
  window.history.replaceState({}, '', '/home?category=Textbooks&sort=price_asc&q=calc');
  render(<App />);
  expect(await screen.findByText(/nothing matches your filters/i)).toBeInTheDocument();
  const [url] = global.fetch.mock.calls.find(([u]) => String(u).includes('/listings?'));
  const params = new URL(url).searchParams;
  expect(params.get('category')).toBe('Textbooks');
  expect(params.get('sort')).toBe('price_asc');
  expect(params.get('q')).toBe('calc');
  expect(screen.getByRole('button', { name: 'Textbooks' })).toHaveClass('chip--active');
  expect(screen.getByLabelText(/search items/i)).toHaveValue('calc');
});

test('a shared filter link survives the sign-in detour', async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).endsWith('/login')) return jsonResponse({ token: 'fresh-token', user_id: 'u1', username: 'danny' });
    if (String(url).endsWith('/me')) return jsonResponse({ user_id: 'u1', username: 'danny' });
    return jsonResponse([]);
  });
  window.history.replaceState({}, '', '/home?category=Tickets&q=concert');
  render(<App />);
  // Not signed in: bounced to the sign-in page...
  expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'danny' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'longenough1' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  // ...and after signing in, back to the filtered Home the link pointed at.
  expect(await screen.findByText(/nothing matches your filters/i)).toBeInTheDocument();
  expect(window.location.search).toBe('?category=Tickets&q=concert');
  expect(screen.getByRole('button', { name: 'Tickets' })).toHaveClass('chip--active');
  const [url] = global.fetch.mock.calls.find(([u]) => String(u).includes('/listings?'));
  expect(new URL(url).searchParams.get('q')).toBe('concert');
});

test('signing out returns to the sign-in page and clears the session', async () => {
  storedSession();
  render(<App />);
  await screen.findByText(/the market is empty/i);
  fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
  expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});

test('the menu toggle opens the navigation, and Escape closes it and restores focus', async () => {
  storedSession();
  render(<App />);
  await screen.findByText(/the market is empty/i);
  const toggle = screen.getByRole('button', { name: /menu/i });
  const nav = screen.getByRole('navigation', { name: /primary/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(nav).toHaveClass('is-open');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(nav).not.toHaveClass('is-open');
  expect(toggle).toHaveFocus();
});

test('the edit dialog takes focus, closes on Escape and returns focus to the Edit button', async () => {
  storedSession();
  const listing = {
    id: 'l1', title: 'Desk Lamp', price: 12, description: 'bright', category: 'Furniture', condition: 'New',
    user_id: 'u1', sold: false, image_url: '/listings/l1/image?v=1',
  };
  global.fetch = jest.fn((url) => {
    if (String(url).endsWith('/me')) return jsonResponse({ user_id: 'u1', username: 'danny' });
    if (String(url).endsWith('/listings/mine')) return jsonResponse([listing]);
    return jsonResponse([]);
  });
  window.history.replaceState({}, '', '/my-listings');
  render(<App />);
  const edit = await screen.findByRole('button', { name: /edit/i });
  edit.focus();
  fireEvent.click(edit);
  const dialog = await screen.findByRole('dialog', { name: /edit item/i });
  expect(dialog).toBeInTheDocument();
  expect(screen.getByLabelText(/^title$/i)).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(edit).toHaveFocus();
});

test('drops the session when the server rejects the token', async () => {
  storedSession();
  global.fetch = jest.fn(() => jsonResponse({ error: 'expired' }, 401));
  render(<App />);
  expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
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
