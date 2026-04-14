import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthProfile } from '@/features/auth/hooks/useAuthProfile'
import { getInitials } from '@/shared/lib/avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import AuthControlsLoading from './AuthControlsLoading'
import AuthDialog from './AuthDialog'
import SignOutItem from './SignOutItem'

type AuthDialogTab = 'login' | 'signup' | null

const AuthControls = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false)
  const [openAuthDialog, setOpenAuthDialog] = useState<AuthDialogTab>(null)

  const {
    loading,
    profile: {
      full_name: fullname,
      avatar_url: avatarUrl,
    },
    refreshProfile,
  } = useAuthProfile(setIsUserLoggedIn)

  if (loading) {
    return <AuthControlsLoading />
  }

  return (
    <div className="flex items-center space-x-2">
      {isUserLoggedIn
        ? (
            <div className="space-x-3 flex items-center my-auto">
              <Button asChild variant="outline" size="lg">
                <Link to="/groups">Groups</Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="w-10 h-10">
                    {avatarUrl !== null && avatarUrl.trim() !== ''
                      ? (
                          <AvatarImage src={avatarUrl} alt={fullname ?? 'avatar'} />
                        )
                      : (
                          <AvatarFallback>
                            {getInitials(fullname)}
                          </AvatarFallback>
                        )}
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account Settings</Link>
                  </DropdownMenuItem>
                  <SignOutItem setUserLoggedIn={setIsUserLoggedIn} />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        : (
            <>
              <AuthDialog
                key={`login-${openAuthDialog === 'login' ? 'open' : 'closed'}`}
                defaultTab="login"
                open={openAuthDialog === 'login'}
                onOpenChange={open => setOpenAuthDialog(open ? 'login' : null)}
                onAuthSuccess={refreshProfile}
              >
                <Button variant="ghost" size="lg">
                  Sign in
                </Button>
              </AuthDialog>
              <AuthDialog
                key={`signup-${openAuthDialog === 'signup' ? 'open' : 'closed'}`}
                defaultTab="signup"
                open={openAuthDialog === 'signup'}
                onOpenChange={open => setOpenAuthDialog(open ? 'signup' : null)}
                onAuthSuccess={refreshProfile}
              >
                <Button variant="default" size="lg">
                  Sign up
                </Button>
              </AuthDialog>
            </>
          )}
    </div>
  )
}

export default AuthControls
