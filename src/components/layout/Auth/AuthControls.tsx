'use client'

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
import Link from 'next/link'
import { useState } from 'react'
import AuthControlsLoading from './AuthControlsLoading'
import SignOutItem from './components/SignOutItem'
import AuthDialog from './forms/AuthDialog'

const AuthControls = () => {
  const [isUserLoggedIn, setUserLoggedIn] = useState<boolean>(false)

  const {
    loading,
    profile: {
      full_name: fullname,
      avatar_url: avatarUrl,
    },
  } = useAuthProfile(setUserLoggedIn)

  if (loading) {
    return <AuthControlsLoading />
  }

  return (
    <div className="flex items-center space-x-2">
      {isUserLoggedIn
        ? (
            <div className="space-x-3 flex items-center my-auto">
              <Button variant="outline" size="lg">
                <Link href="/groups">Groups</Link>
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
                    <Link href="/account">Account Settings</Link>
                  </DropdownMenuItem>
                  <SignOutItem setUserLoggedIn={setUserLoggedIn} />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        : (
            <>
              <AuthDialog defaultTab="login">
                <Button variant="ghost" size="lg">Sign in</Button>
              </AuthDialog>
              <AuthDialog defaultTab="signup">
                <Button variant="default" size="lg">Sign up</Button>
              </AuthDialog>
            </>
          )}
    </div>
  )
}

export default AuthControls
