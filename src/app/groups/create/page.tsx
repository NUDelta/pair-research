import type { Metadata } from 'next'
import CreateGroupForm from '@/components/groups/create'

export const metadata: Metadata = {
  title: 'Create A New Group | Pair Research',
}

export default function CreateGroupPage() {
  return (
    <div className="container max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create A New Group</h1>
      <CreateGroupForm />
    </div>
  )
}
