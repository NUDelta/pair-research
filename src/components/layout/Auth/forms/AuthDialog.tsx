import { useState } from 'react'
import { LogoPicture } from '@/components/common'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

interface AuthDialogProps {
  /** The trigger element (e.g., a button) */
  children: React.ReactNode
  /** Which tab to show first */
  defaultTab?: 'login' | 'signup'
  open?: boolean
  onOpenChange: (open: boolean) => void
  onAuthSuccess?: () => Promise<void> | void
}

const AuthDialog = ({
  children,
  defaultTab = 'login',
  open,
  onOpenChange,
  onAuthSuccess,
}: AuthDialogProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const tabContent = {
    login: {
      title: 'Welcome back',
      description: 'Sign in to your PaySync account to continue splitting bills',
    },
    signup: {
      title: 'Create account',
      description: 'Join PaySync and start splitting bills with ease',
    },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogDescription className="sr-only">
        Authentication dialog with login and signup options
      </DialogDescription>
      <DialogContent className="sm:max-w-md w-full mx-4 backdrop-blur-sm border-0 shadow-xl">
        <div className="space-y-6">
          {/* Logo and branding */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl shadow-inner flex items-center justify-center mx-auto transition-transform duration-300 hover:scale-105 hover:shadow-md">
              <LogoPicture className="w-10 h-10 rounded-2xl" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-semibold">
                {tabContent[activeTab].title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {tabContent[activeTab].description}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={value => setActiveTab(value as 'login' | 'signup')}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <LoginForm toggleOpen={() => onOpenChange(false)} onAuthSuccess={onAuthSuccess} />
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <SignupForm toggleOpen={() => onOpenChange(false)} onAuthSuccess={onAuthSuccess} />
            </TabsContent>
          </Tabs>

          {/* Terms and Privacy */}
          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              By continuing, you agree to our
              {' '}
              <button
                type="button"
                className="underline hover:text-foreground transition-colors"
              >
                Terms of Service
              </button>
              {' '}
              and
              {' '}
              <button
                type="button"
                className="underline hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AuthDialog
