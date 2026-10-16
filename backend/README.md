# Pratibimba backend administration

## Administrative roles

- `super_admin` inherits routes explicitly granted to `admin` and exclusively manages user roles.
- `admin` retains routine application and audit administration but cannot create accounts, change roles, or edit role definitions.
- Auditor, coordinator, and Prakalpa Manager workflow checks remain role- and assignment-specific. Superadmin status does not grant those operational identities.
- The legacy `Role.permissions` flags are not the backend authorization authority. Role definitions are therefore read-only; access is enforced by server-side route and workflow policies.

## Initial Superadmin provisioning

Provisioning promotes an existing, active Admin account. It is allowed only when there is no active Superadmin, does not set or reveal a password, and writes an activity-log record.

```sh
npm run provision-superadmin -- --email existing-admin@example.org --confirm
```

Run this command manually in the intended environment after reviewing the selected account. It is not part of application startup or the seed process. The command was not run as part of this implementation.

## Administrative activity

`GET /api/v1/activity-logs` returns the most recent 100 role and Superadmin-account changes and is restricted to Superadmins.

Role changes and account profile/deactivation updates run in MongoDB transactions and write a shared mutation-guard document before checking the active-Superadmin count. This database-level write serializes competing mutations across application instances; user changes and their activity logs commit or roll back together. These administrative endpoints therefore require a transaction-capable MongoDB replica set or sharded cluster. Unsupported deployments return an error instead of applying a non-atomic change.
