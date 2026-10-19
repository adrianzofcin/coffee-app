# Coffee

Personal coffee companion installed on the phone as a PWA: coffee bags, recipes (Espresso, V60, Cold Brew), guided brewing and stats.

Stack: Vite, Vue 3, TypeScript, Pinia, Tailwind CSS v4, vite-plugin-pwa, Supabase. Full documentation (Slovak) lives in [`docs/`](docs/README.md).

## Local development

```bash
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev            # http://localhost:5173, also reachable from the LAN
```

| Command | Description |
|---|---|
| `npm run dev` | Dev server (`--host`, open it from the phone on the same Wi-Fi) |
| `npm run build` | Type check + production build into `dist/` |
| `npm run preview` | Serve the production build, including the service worker |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run generate-pwa-assets` | Regenerate icons from `public/icon.svg` |

The service worker only registers on `localhost` or HTTPS, so installing on the phone needs the GitHub Pages deploy.

## Environment

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` / secret `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` / secret `SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → anon / publishable key |
| `VITE_AUTH_EMAIL_DOMAIN` | `.env` / variable `AUTH_EMAIL_DOMAIN` | Domain of technical login e-mails (`username@domain`) |

Never put the `service_role` / secret key anywhere in this project.

## Supabase setup

1. Create a project in region **Central EU (Frankfurt)**.
2. **Authentication → Sign In / Providers**: disable *Allow new users to sign up*, keep *Email* enabled, disable *Confirm email*.
3. **Authentication → Users → Add user → Create new user**: e-mail `<username>@<AUTH_EMAIL_DOMAIN>`, a password, tick *Auto Confirm User*.
4. Copy the Project URL and anon key into `.env` and into the GitHub secrets.

Users sign in with the username only; the app appends the domain. Sessions never expire unless you log out or change the password.

### Database migrations

The schema lives in `supabase/migrations/` (applied in file-name order). Either:

- **Supabase CLI** (once: `npx supabase login` and `npx supabase link --project-ref <ref>`), then `npx supabase db push`, or
- paste each new migration file into **SQL Editor** in the Supabase dashboard and run it.

## Deploy (GitHub Pages)

One-time setup in the GitHub repository:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions**:
   - Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - Variables: `AUTH_EMAIL_DOMAIN`

The app is public only while you install or update it:

1. **Actions → Deploy → Run workflow** → open `https://<user>.github.io/<repo>/` on the phone.
   - Android (Chrome): *Install app*. iOS (Safari): *Share → Add to Home Screen*.
   - Updating an installed app: open it and tap *Reload* on the "New version available" banner.
2. **Actions → Unpublish → Run workflow** (also runs automatically every night).

The installed app keeps working from its cache after unpublishing.
