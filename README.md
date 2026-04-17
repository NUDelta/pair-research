# Pair Research

[Pair Research](http://users.eecs.northwestern.edu/~hq/papers/pairresearch.pdf) is a new kind of interaction developed by Miller, Zhang, Gilbert & Gerber designed to pair members of group together weekly to work on each other's projects.

This application takes the original Google Sheets prototype further, developing platform on which users can create customized groups to make pairings with, view analytics, and promote pairings and collaboration between certain subgroups (e.g. professors with students in a research lab)

## Development

This project is built with [TanStack Start](https://tanstack.com/start/latest) and Vite. Routes live under `src/routes`, Prisma is used for relational app data, and Supabase Auth handles authentication, storage, and realtime updates.

### API Organization

TO BE WRITTEN

### Authentication

TO BE WRITTEN

### The Pair Research Algorithm

TO BE WRITTEN

### Git Setup

TO BE WRITTEN

## Deployment

The production application is deployed on Cloudflare Workers. The `deploy` script in `package.json` builds the application and deploys it using Wrangler. Make sure you have the Cloudflare CLI tool installed and configured with your account credentials to use this deployment method.

### Setup

You will need the following information to be set up in the `.env` file:

- `DATABASE_URL`: This is the URL to your PostgreSQL database. It should be in the format `postgres://username:password@host:port/postgres`.
- `SUPABASE_SECRET_KEY`: This is the server-only Supabase secret key for admin operations. You need it to create new users and send invitations when they are invited to join a group but not yet registered.
- `R2_PUBLIC_DOMAIN`: This is the public domain for your Cloudflare R2 bucket, used for direct image access. It should be in the format `https://r2.your-domain.com`.
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`: This is the server-only Cloudflare Turnstile secret key for verifying captcha responses.

Below are public client variables. These can live in `.env.local` for local development:

- `VITE_SUPABASE_URL`: This is the URL to your Supabase instance. It should be in the format `https://your-project-ref.supabase.co`.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: This is the browser-safe Supabase publishable key.
- `VITE_SITE_BASE_URL`: Optional canonical site URL used for sitemap generation in production and for auth email confirmation redirects.
- `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`: This is the public client Cloudflare Turnstile site key for verifying captcha responses.
