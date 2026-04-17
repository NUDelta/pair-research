import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/groups/$slug')({
  component: Outlet,
})
