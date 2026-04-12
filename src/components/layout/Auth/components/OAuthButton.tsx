import { useState } from 'react'
import { toast } from 'sonner'
import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { sanitizeRedirectPath } from '@/utils/supabase/authRedirect'
import { createClient } from '@/utils/supabase/client'

export const OAuthButton = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const supabase = createClient()

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const redirectPath = sanitizeRedirectPath(
        new URL(globalThis.location.href).searchParams.get('next'),
        '/groups',
      )
      const redirectTo = new URL('/auth/callback', globalThis.location.origin)
      redirectTo.searchParams.set('next', redirectPath)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
        },
      })

      if (error) {
        setLoading(false)
        toast.error(error.message)
      }
    }
    catch (error) {
      setLoading(false)
      toast.error(error instanceof Error ? error.message : 'Failed to start Google sign-in')
    }
  }

  return (
    <div className="my-5 flex flex-col gap-4">
      <Button
        type="button"
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
                <img
                  src="/images/google.webp"
                  alt="Google Icon"
                  width={20}
                  height={20}
                  className="h-5 w-5"
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
