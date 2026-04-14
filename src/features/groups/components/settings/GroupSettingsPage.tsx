import type { GroupSettingsData } from './types'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, FolderCogIcon, Settings2Icon, ShieldCheckIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import GroupBasicsFormCard from './GroupBasicsFormCard'

interface GroupSettingsPageProps {
  settings: GroupSettingsData
}

export default function GroupSettingsPage({ settings }: GroupSettingsPageProps) {
  const confirmedMembers = settings.members.filter(member => !member.isPending)
  const adminMembers = confirmedMembers.filter(member => member.isAdmin)
  const [activeSection, setActiveSection] = useState<'general' | 'members'>('general')
  const sections = [
    {
      value: 'general' as const,
      title: 'General',
      description: 'Update the name and description',
      icon: Settings2Icon,
    },
    {
      value: 'members' as const,
      title: 'Members',
      description: 'Invite people and manage access',
      icon: UsersIcon,
    },
  ]

  return (
    <div className="container mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link to="/groups/$slug" params={{ slug: settings.group.id }}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to group
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <FolderCogIcon className="size-5 text-muted-foreground" />
            <h1 className="text-3xl font-semibold tracking-tight">Group settings</h1>
          </div>
          <p className="max-w-3xl text-muted-foreground">
            Manage the name, description, members, and admin access for
            {' '}
            <span className="font-medium text-foreground">{settings.group.name}</span>
            .
          </p>
        </div>
      </div>

      <Tabs
        value={activeSection}
        onValueChange={(value) => {
          if (value === 'general' || value === 'members') {
            setActiveSection(value)
          }
        }}
        orientation="vertical"
        className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Navigate between the group management sections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsList className="flex h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
                {sections.map((section) => {
                  const SectionIcon = section.icon

                  return (
                    <TabsTrigger
                      key={section.value}
                      value={section.value}
                      className="h-auto w-full justify-start gap-3 rounded-lg border px-4 py-3 text-left"
                    >
                      <SectionIcon />
                      <span className="flex flex-col items-start gap-1">
                        <span>{section.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {section.description}
                        </span>
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Current group state at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersIcon />
                    Members
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{confirmedMembers.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheckIcon />
                    Admins
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{adminMembers.length}</p>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Available roles</p>
                <div className="flex flex-wrap gap-2">
                  {settings.roles.map(role => (
                    <Badge key={role.id} variant="outline">
                      {role.title}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-dashed p-4">
                <p className="font-medium">Current policy</p>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                  <li>The creator stays an admin in this initial version.</li>
                  <li>At least one confirmed admin must always remain.</li>
                  <li>Confirmed members cannot be removed during an active pairing.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <TabsContent value="general" className="mt-0 flex flex-col gap-6">
            <GroupBasicsFormCard group={settings.group} />
          </TabsContent>
          <TabsContent value="members" className="mt-0 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member management</CardTitle>
                <CardDescription>
                  Invite people, update roles, and manage admin access from this section.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Member management is being added as a dedicated workspace for this settings page.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
