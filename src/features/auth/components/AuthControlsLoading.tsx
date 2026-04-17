import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'

const AuthControlsLoading = () => {
  return (
    <div className="flex items-center space-x-2">
      <Button asChild variant="ghost" size="lg" className="rounded-full px-4">
        <Link to="/login">Sign in</Link>
      </Button>
      <Button asChild variant="default" size="lg" className="rounded-full px-5 shadow-md shadow-sky-200/70">
        <Link to="/signup">Sign up</Link>
      </Button>
    </div>
  )
}

export default AuthControlsLoading
