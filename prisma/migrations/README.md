# Migrations — read before using `prisma migrate`

**This project deploys with `prisma db push`, not `prisma migrate deploy`.**
See `buildCommand` in `vercel.json`.

## Why

`0_init` was generated from the current schema with
`prisma migrate diff --from-empty`, so it contains `CREATE TABLE` for all 69
tables. The production database already has those tables but was never
baselined — it has no `_prisma_migrations` row for `0_init`.

Running `prisma migrate deploy` against production in that state fails with
`relation already exists`, which fails the Vercel build. That is exactly what
happened once already: the build command was switched to `migrate deploy`, the
deploy broke, and it was reverted to a command with no schema sync at all —
which then left production missing columns (`Project.reviewState`,
`CorridorProfile.centroidLat`, …) while the app queried for them.

`db push` has no such problem: it diffs the live database against the schema and
applies what is missing, so it self-heals drift on every deploy.

## If you want to move to migrations properly

Do it deliberately, not by editing the build command:

1. Baseline production once, so Prisma stops trying to create existing tables:

   ```
   DATABASE_URL="<production url>" npx prisma migrate resolve --applied 0_init
   ```

2. Confirm the baseline took, and that production actually matches the schema:

   ```
   DATABASE_URL="<production url>" npx prisma migrate status
   ```

   If it reports drift, production is missing columns that `0_init` assumes.
   Generate a catch-up migration from the live database before going further:

   ```
   npx prisma migrate diff \
     --from-url "<production url>" \
     --to-schema prisma/schema.prisma \
     --script > prisma/migrations/<timestamp>_catchup/migration.sql
   ```

   Read that SQL. If it contains `DROP`, stop and work out why.

3. Only once `migrate status` is clean, switch `buildCommand` in `vercel.json`
   to `npx prisma migrate deploy && npx prisma generate && next build`.

Until step 3 is done, leave the build on `db push`.

## Note on the connection used for schema work

Supabase's transaction pooler (port 6543, `pgbouncer=true`) cannot run DDL —
`db push` against it hangs until the build times out. `prisma.config.ts`
therefore rewrites the connection to the session pooler on 5432 for CLI work,
or uses `DIRECT_URL` if you set one. The application runtime keeps using the
pooled `DATABASE_URL`, which is correct for serverless.

## Note on `--accept-data-loss`

The build deliberately runs plain `prisma db push`. Without
`--accept-data-loss`, push refuses any destructive change and fails the build
instead of silently dropping a column. If a deploy fails that way, the schema
change genuinely needs a human decision — do not add the flag to get past it.
