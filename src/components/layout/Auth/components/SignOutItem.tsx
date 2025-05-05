import DoubleConfirmDialog from '@/components/common/DoubleConfirmDialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const SignOutItem = () => {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      toast.error('Error signing out')
    }
    else {
      toast.success('Signed out successfully')
      router.refresh()
    }
  }

  return (
    <DoubleConfirmDialog
      trigger={(
        <DropdownMenuItem
          onSelect={(e) => {
          // Prevent default dropdown closing behavior
            e.preventDefault()
          }}
        >
          Sign Out
        </DropdownMenuItem>
      )}
      title="Sign out?"
      description="Are you sure you want to sign out?"
      confirmText="Sign Out"
      cancelText="Cancel"
      onConfirm={handleSignOut}
      pendingText="Signing out..."
    />
  )
}

export default SignOutItem
