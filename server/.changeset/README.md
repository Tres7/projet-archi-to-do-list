# Backend Changesets

Use this directory only for backend runtime service release notes.

Create a backend changeset with:

```bash
npm --prefix server run changeset
```

Select only the backend service packages that need a release:

- `@app/auth-service`
- `@app/project-service`
- `@app/task-service`
- `@app/notification-service`
- `@app/gateway`

Backend service versions are independent. Do not use fixed or linked release groups.
