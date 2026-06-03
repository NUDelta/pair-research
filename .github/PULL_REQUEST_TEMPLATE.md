## Summary

Describe what changed and why.

## Key Changes

-

## Validation

- [ ] `pnpm run release:preflight`
- [ ] `pnpm run lint:ci`
- [ ] `pnpm run test:unit`
- [ ] `pnpm run test:e2e`
- [ ] `pnpm run test:e2e:auth`
- [ ] `pnpm run build`

List any checks that were intentionally skipped and why:

-

## UI Verification

- [ ] Loading state checked
- [ ] Empty state checked
- [ ] Error state checked
- [ ] Keyboard and focus behavior checked
- [ ] Mobile layout checked
- [ ] Not applicable

## Release and Data Safety

- [ ] No secrets, cookies, tokens, or private environment values are committed or logged
- [ ] Database schema changes include migration artifacts or are intentionally absent
- [ ] Cloudflare bindings, required secrets, R2, Durable Objects, public routes, and CI gates pass release preflight
- [ ] Auth, authorization, and redirect behavior were reviewed when touched
- [ ] Legal, support, SEO, analytics, or public metadata changes pass automated tests or preflight when public pages changed

## Risks and Follow-Ups

-
