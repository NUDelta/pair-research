# Pair Research

[Pair Research](http://users.eecs.northwestern.edu/~hq/papers/pairresearch.pdf) is a new kind of interaction developed by Miller, Zhang, Gilbert & Gerber designed to pair members of group together weekly to work on each other's projects.

This application takes the original Google Sheets prototype further, developing platform on which users can create customized groups to make pairings with, view analytics, and promote pairings and collaboration between certain subgroups (e.g. professors with students in a research lab)

## Development

This project is built with [TanStack Start](https://tanstack.com/start/latest) and Vite. Routes live under `src/app`, Prisma is used for relational app data, and Supabase handles authentication, storage, and realtime updates.

### API Organization

TO BE WRITTEN

### Authentication

TO BE WRITTEN

### The Pair Research Algorithm

TO BE WRITTEN

### Git Setup

TO BE WRITTEN

## Deployment

The production build is a TanStack Start server output intended to run on a Node host. The current start command is:

```bash
pnpm run start
```

### Setup

You will need the following information to be set up in the `.env` file:

- `DATABASE_URL`: This is the URL to your PostgreSQL database. It should be in the format `postgres://username:password@host:port/postgres`.
- `S3_ACCESS_KEY`: This is the access key for your Supabase storage bucket.
- `S3_SECRET_KEY`: This is the secret key for your Supabase storage bucket.
- `SERVICE_ROLE_SECRET`: This is the service role secret for your Supabase instance. You need it to create new users and send invitations when they are invited to join a group but not yet registered.

Below are public client variables. These can live in `.env.local` for local development:

- `VITE_SUPABASE_URL`: This is the URL to your Supabase instance. It should be in the format `https://your-project-ref.supabase.co`.
- `VITE_SUPABASE_ANON_KEY`: This is the anonymous key for your Supabase instance.
- `VITE_SITE_BASE_URL`: Optional canonical site URL used for sitemap generation in production.

Sample `.env` file:

```env
DATABASE_URL="postgres://prisma.[Supabase Project ID]:[Password]@[Supabase Project Location].pooler.supabase.com:5432/postgres"
S3_ACCESS_KEY="[Supabase Storage S3 Compatible Access Key]"
S3_SECRET_KEY="[Supabase Storage S3 Compatible Secret Key]"
SERVICE_ROLE_SECRET="[Supabase Project Service Role Secret]"
```

Sample `.env.local` file:

```env
VITE_SUPABASE_URL="https://[Supabase Project Ref].supabase.co"
VITE_SUPABASE_ANON_KEY="[Supabase Project Anon Key]"
VITE_SITE_BASE_URL="https://example.com"
```
