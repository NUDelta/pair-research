'use client'

import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

export const OAuthButton = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const supabase = createClient()

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error('Failed to sign in with Google')
      setLoading(false)
    }
  }

  return (
    <div className="my-5 flex flex-col gap-4">
      <Button
        variant="outline"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-2"
      >
        {loading
          ? (
              <Spinner text="Redirecting to Google.." className="w-5" />
            )
          : (
              <>
                <Image
                  src="/images/google.webp"
                  alt="Google Icon"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                  unoptimized
                  priority
                />
                Sign in with Google
              </>
            )}
      </Button>
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-muted" />
        <div className="text-sm text-muted-foreground">or</div>
        <div className="h-px flex-1 bg-muted" />
      </div>
    </div>
  )
}
