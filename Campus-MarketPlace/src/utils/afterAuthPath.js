// Where to send a user after signing in or up: back to the page they were
// redirected away from (kept in router state by App.js), otherwise Home.
export const afterAuthPath = (state) => {
    const from = state?.from;
    if (!from || !from.pathname || ['/', '/signin', '/signup'].includes(from.pathname)) {
        return '/home';
    }
    return `${from.pathname}${from.search || ''}`;
};
