export async function getPrismaClient() {
  const { getPrismaClient } = await import('./prisma.server')
  return getPrismaClient()
}
