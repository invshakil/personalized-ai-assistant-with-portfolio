# Logins and records

- **Login:** the local admin, from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env.local`. `npm run seed` creates it, and sets its password from the environment again each time it runs.
- **Signed out:** use a private window for the public pages, so the admin session doesn't affect them.
- **Records:** anything a test saves is named with `zz-test-`, such as a tenant `zz-test-tenant` or a booking under `zz-test-booking`. Delete it when the test is done.
- **Amounts:** use round, made-up amounts. Don't copy a real balance into a test record or a screenshot.
- **Never** test on sshakil.com with anything that saves.
