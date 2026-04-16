export async function createServiceRoleSupabase() {
  const { createServiceRoleSupabase } = await import('./serviceRole.server')
  return createServiceRoleSupabase()
}
