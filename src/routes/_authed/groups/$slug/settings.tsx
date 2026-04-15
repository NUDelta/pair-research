import { createFileRoute, redirect } from '@tanstack/react-router'
import GroupSettingsPage from '@/features/groups/components/settings/GroupSettingsPage'
import { getGroupSettings } from '@/features/groups/server/groups/getGroupSettings'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/_authed/groups/$slug/settings')({
  loader: async ({ params }) => {
    if (!UUID_REGEX.test(params.slug)) {
      throw redirect({ to: '/groups' })
    }

    const result = await getGroupSettings({ data: { groupId: params.slug } })
    if (result === null) {
      throw redirect({ to: '/groups/$slug', params: { slug: params.slug } })
    }

    return result
  },
  head: () => ({
    meta: [{ title: 'Group Settings | Pair Research' }],
  }),
  component: GroupSettingsRoute,
})

function GroupSettingsRoute() {
  const settings = Route.useLoaderData()

  return <GroupSettingsPage settings={settings} />
}
