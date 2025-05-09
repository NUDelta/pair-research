'use client'

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
import { SignupForm } from './SignupForm'

interface AuthDialogProps {
  /** The trigger element (e.g., a button) */
  children: React.ReactNode
  /** Which tab to show first */
  defaultTab?: 'login' | 'signup'
}

export default function AuthDialog({ children, defaultTab = 'login' }: AuthDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogDescription className="sr-only">
        This is a dialog for authentication. It contains two tabs: Login and Sign Up.
      </DialogDescription>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="auth-dialog">
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" aria-describedby="Login Form">
            <DialogHeader>
              <DialogTitle>Welcome back</DialogTitle>
            </DialogHeader>
            <LoginForm />
          </TabsContent>

          <TabsContent value="signup" aria-describedby="Signup Form">
            <DialogHeader>
              <DialogTitle>Create an account</DialogTitle>
            </DialogHeader>
            <SignupForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
