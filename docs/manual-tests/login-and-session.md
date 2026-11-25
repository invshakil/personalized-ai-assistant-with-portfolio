# Login and the sliding session (#18)

Signed out to start, then the local admin login. Saves nothing.

1. **Wrong password:** on `/admin/login`, enter the right email and a wrong password. You should see an error and stay on the login page.
2. **Sign in:** enter the right password. You should land on `/admin`.
3. **Stay signed in:** open two other admin pages, then reload. You should stay signed in.
4. **Sign out:** use Sign out in the sidebar. Opening `/admin` should send you to `/admin/login`.
5. **API while signed out:** open `/api/admin/finance/payments` in the browser. You should see `{"error":"Unauthorized"}`.

- **Must not happen:** an admin page or an admin API answering while signed out; a wrong password signing you in.
- **Records:** none are changed.
