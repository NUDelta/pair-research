'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthProfile } from '@/hooks'
import Link from 'next/link'
import SignOutItem from './components/SignOutItem'
import AuthDialog from './forms/AuthDialog'

const AuthControls = () => {
  const {
    loading,
    userLoggedIn,
    profile: {
      full_name: fullname,
      avatar_url: avatarUrl,
    },
  } = useAuthProfile()

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {userLoggedIn
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
                            {fullname !== null
                              ? fullname.split(' ').slice(0, 2).map(name => name[0]).join('')
                              : 'U'}
                          </AvatarFallback>
                        )}
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/account">Account Settings</Link>
                  </DropdownMenuItem>
                  <SignOutItem />
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
