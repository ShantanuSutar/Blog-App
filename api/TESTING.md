# Backend tests

The backend uses Node's built-in test runner. The suite combines focused unit
tests with HTTP integration tests that exercise the real Express routes,
controllers, middleware, migrations, and PostgreSQL queries.

## Run the suite

```sh
cd api
npm test
```

For the built-in line, branch, and function coverage report:

```sh
npm run test:coverage
```

No API server needs to be started manually.

## Database isolation

Tests never use the configured non-local application database. The runner uses
one of these strategies:

1. `TEST_DATABASE_URL`, when explicitly configured. Its database name must
   contain `test`.
2. A local configured PostgreSQL database. Tests still run in a uniquely named
   temporary schema.
3. A disposable local PostgreSQL cluster when the application database is
   remote and PostgreSQL binaries are installed.

Every run creates a unique `unsaid_test_*` schema, applies all migrations,
runs files serially for deterministic database access, drops the schema, and
removes temporary uploads. The database helper also verifies the active schema
before any table cleanup.

For CI, provide a dedicated database such as:

```text
TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/unsaid_test
```

See `.env.test.example` for safe placeholders. Do not point
`TEST_DATABASE_URL` at a production database.

## Test organization

- `test/integration/backend.test.js` covers the real HTTP and PostgreSQL flow.
- `test/helpers/integration.js` provides isolated cleanup, API requests, users,
  posts, and safe error assertions.
- The remaining files cover controllers and security utilities in focused
  units, including uploads, validation, authorization, search, pagination,
  rate limiting, logging, startup, and scheduling.

Integration cases reset application tables before every test and create their
own fixtures, so they do not depend on execution order.
