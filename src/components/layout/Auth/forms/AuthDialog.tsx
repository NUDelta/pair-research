'use client'

import {
  Dialog,
  DialogContent,
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
      <DialogContent className="sm:max-w-[425px]">
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <DialogHeader>
              <DialogTitle>Welcome back</DialogTitle>
            </DialogHeader>
            <LoginForm />
          </TabsContent>

          <TabsContent value="signup">
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
