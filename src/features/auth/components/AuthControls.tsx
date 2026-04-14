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
import SignOutItem from './SignOutItem'

const AuthControls = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false)

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
              <Button asChild variant="ghost" size="lg" className="rounded-full px-4">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="default" size="lg" className="rounded-full px-5 shadow-md shadow-sky-200/70">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
    </div>
  )
}

export default AuthControls
