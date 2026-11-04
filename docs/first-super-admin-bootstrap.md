# First super-administrator bootstrap

The bootstrap is an owner-operated database transaction that assigns one trusted role and writes its audit event. It must never use signup metadata, browser state, or JWT role claims.

## Current status: blocked

The latest schema-audit report names `fchvtcnhabmnlfxsrzvu` as the owner-specified project. The current ignored frontend/backend environment files and `supabase/.temp/project-ref` instead point to `wcxxyyebcgofziylgwdg`. The recorded audits also disagree on Auth identity and question counts. The project, target Auth UUID, current role history, and production runtime database role must be freshly reconciled before bootstrap. This task does not authorize a production bootstrap. Do not use previously recorded project IDs or UUIDs as current approval.

The local backend default for `TRUSTED_ROLE_LOOKUP_ENABLED` is `false`. Keep it false until the exact target account has been verified in the confirmed project's `auth.users`, a successful rehearsal and current schema/grant checks are complete, the owner approves the exact bootstrap, and the deployed runtime role is verified.

## Preconditions

1. Confirm the intended Supabase project with the owner and make all deployment/local project references consistent.
2. Read-only verify the migration ledger, role/audit schema, RLS, effective privileges, candidate Auth UUID, existing/revoked super-administrator assignments, and prior bootstrap audit events.
3. Rehearse against a disposable compatible database. Never use production as a rehearsal target.
4. Obtain explicit owner approval for the exact project and Auth UUID. Obtain the database URL from the approved secret manager; do not put it in files or chat.
5. Require a TLS connection as the verified database owner/operator permitted to read `auth.users` and write the two role/audit tables. The script checks the project endpoint, TLS, operator role, candidate UUID, and one-time eligibility in the transaction.

## Run after all preconditions pass

From `backend/`, stage process-only variables in a fresh PowerShell session. Replace the project ref and UUID only with the values just approved and verified by the owner:

```powershell
$env:BOOTSTRAP_SUPABASE_URL = Read-Host 'Confirmed Supabase project URL'
$env:BOOTSTRAP_EXPECTED_PROJECT_REF = Read-Host 'Confirmed project reference'
$secureDatabaseUrl = Read-Host 'TLS database URL from the approved secret manager' -AsSecureString
$env:BOOTSTRAP_DATABASE_URL = [System.Net.NetworkCredential]::new('', $secureDatabaseUrl).Password
$env:BOOTSTRAP_OWNER_ROLE = Read-Host 'Exact PostgreSQL operator role'
$env:BOOTSTRAP_TARGET_USER_ID = Read-Host 'Owner-approved existing Auth UUID'
$env:BOOTSTRAP_CONFIRM_USER_ID = Read-Host 'Re-enter the same Auth UUID'
```

After the just-in-time checks and explicit approval, run:

```powershell
.\.venv\Scripts\python.exe scripts\bootstrap_first_super_admin.py `
  --user-id $env:BOOTSTRAP_TARGET_USER_ID `
  --confirm-user-id $env:BOOTSTRAP_CONFIRM_USER_ID `
  --reason 'Owner-approved first NIMCET.XYZ super administrator bootstrap'
```

The script serializes attempts, refuses when the target is absent or any historical super-admin/bootstrap event exists, and commits the role assignment and audit event atomically. Verify both committed rows with an owner-controlled read-only query. If any check fails, leave trusted role lookup disabled.

Clear process variables when finished:

```powershell
'BOOTSTRAP_SUPABASE_URL','BOOTSTRAP_EXPECTED_PROJECT_REF','BOOTSTRAP_DATABASE_URL', `
  'BOOTSTRAP_OWNER_ROLE','BOOTSTRAP_TARGET_USER_ID','BOOTSTRAP_CONFIRM_USER_ID' | `
  ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
```

Only after successful verification should the deployment set `TRUSTED_ROLE_LOOKUP_ENABLED=true`, restart FastAPI, and verify the approved account receives its database-backed role while a normal account and forged token claims do not.
