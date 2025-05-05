# Pair Research

[Pair Research](http://users.eecs.northwestern.edu/~hq/papers/pairresearch.pdf) is a new kind of interaction developed by Miller, Zhang, Gilbert & Gerber designed to pair members of group together weekly to work on each other's projects.

This application takes the original Google Sheets prototype further, developing platform on which users can create customized groups to make pairings with, view analytics, and promote pairings and collaboration between certain subgroups (e.g. professors with students in a research lab)

## Development

This project is developed with [Next.js](https://nextjs.org/) best practices in mind. This section describes some architectural design decisions and any nonconventional dev solutions.

### API Organization

TO BE WRITTEN

### Authentication

TO BE WRITTEN

### The Pair Research Algorithm

TO BE WRITTEN

### Git Setup

TO BE WRITTEN

## Deployment

TO BE WRITTEN

### Setup

You will need the following information to be set up in the `.env` file:

- `DATABASE_URL`: This is the URL to your PostgreSQL database. It should be in the format `postgres://username:password@host:port/postgres`.
- `S3_ACCESS_KEY`: This is the access key for your Supabase storage bucket.
- `S3_SECRET_KEY`: This is the secret key for your Supabase storage bucket.
- `SERVICE_ROLE_SECRET`: This is the service role secret for your Supabase instance. You need it to create new users and send invitations when they are invited to join a group but not yet registered.

Below are information not secured, if you wish you can put in a separate `.env.local` file:

- `NEXT_PUBLIC_SUPABASE_URL`: This is the URL to your Supabase instance. It should be in the format `https://your-project-ref.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: This is the anonymous key for your Supabase instance.

Sample `.env` file:

```env
DATABASE_URL="postgres://prisma.[Supabase Project ID]:[Password]@[Supabase Project Location].pooler.supabase.com:5432/postgres"
S3_ACCESS_KEY="[Supabase Storage S3 Compatible Access Key]"
S3_SECRET_KEY="[Supabase Storage S3 Compatible Secret Key]"
SERVICE_ROLE_SECRET="[Supabase Project Service Role Secret]"
```

Sample `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL="https://[Supabase Project Ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[Supabase Project Anon Key]"
```

### Deploying

TO BE WRITTEN
