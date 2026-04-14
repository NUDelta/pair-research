import type { GroupSettingsData } from './types'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  FolderCogIcon,
  KeyRoundIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import GroupBasicsFormCard from './GroupBasicsFormCard'
import GroupMembersTable from './members/GroupMembersTable'
import GroupRolesSection from './roles/GroupRolesSection'

interface GroupSettingsPageProps {
  settings: GroupSettingsData
}

export default function GroupSettingsPage({ settings }: GroupSettingsPageProps) {
  const confirmedMembers = settings.members.filter(member => !member.isPending)
  const adminMembers = confirmedMembers.filter(member => member.isAdmin)
  const [activeSection, setActiveSection] = useState<'general' | 'members' | 'roles'>('general')
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
    {
      value: 'roles' as const,
      title: 'Roles',
      description: 'Manage role definitions and assignments',
      icon: KeyRoundIcon,
    },
  ]

  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-6 p-6">
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
            Manage settings for
            {' '}
            <span className="font-medium text-foreground">{settings.group.name}</span>
            .
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1">
          <UsersIcon className="size-4" />
          <span>
            {confirmedMembers.length}
            {' '}
            members
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1">
          <ShieldCheckIcon className="size-4" />
          <span>
            {adminMembers.length}
            {' '}
            admins
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1">
          <KeyRoundIcon className="size-4" />
          <span>
            {settings.roles.length}
            {' '}
            roles
          </span>
        </span>
      </div>

      <Tabs
        value={activeSection}
        onValueChange={(value) => {
          if (value === 'general' || value === 'members' || value === 'roles') {
            setActiveSection(value)
          }
        }}
        orientation="vertical"
        className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="-mb-4">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <TabsList className="flex h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
                {sections.map((section) => {
                  const SectionIcon = section.icon

                  return (
                    <TabsTrigger
                      key={section.value}
                      value={section.value}
                      className="h-auto w-full justify-start gap-3 rounded-lg border px-4 py-3 text-left hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      <SectionIcon />
                      <span className="flex flex-col items-start">
                        <span>{section.title}</span>
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <TabsContent value="general" className="mt-0 flex flex-col gap-6">
            <GroupBasicsFormCard group={settings.group} />
          </TabsContent>
          <TabsContent value="members" className="mt-0 flex flex-col gap-6">
            <GroupMembersTable
              creatorId={settings.group.creatorId}
              currentUserId={settings.currentUserId}
              groupId={settings.group.id}
              hasActivePairing={settings.group.activePairingId !== null}
              members={settings.members}
              roles={settings.roles}
            />
          </TabsContent>
          <TabsContent value="roles" className="mt-0 flex flex-col gap-6">
            <GroupRolesSection
              groupId={settings.group.id}
              members={settings.members}
              roles={settings.roles}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
