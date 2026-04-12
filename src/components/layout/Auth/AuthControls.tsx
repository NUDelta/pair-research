import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthProfile } from '@/hooks'
import { getInitials } from '@/utils/avatar'
import AuthControlsLoading from './AuthControlsLoading'
import SignOutItem from './components/SignOutItem'
import AuthDialog from './forms/AuthDialog'

const AuthControls = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState<boolean>(false)

  const {
    loading,
    profile: {
      full_name: fullname,
      avatar_url: avatarUrl,
    },
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
                defaultTab="login"
                open={isAuthDialogOpen}
                onOpenChange={() => setIsAuthDialogOpen(!isAuthDialogOpen)}
              >
                <Button variant="ghost" size="lg">
                  Sign in
                </Button>
              </AuthDialog>
              <AuthDialog
                defaultTab="signup"
                open={isAuthDialogOpen}
                onOpenChange={() => setIsAuthDialogOpen(!isAuthDialogOpen)}
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
