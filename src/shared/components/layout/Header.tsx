import { Link } from '@tanstack/react-router'
import { Suspense } from 'react'
import AuthControls from '@/features/auth/components/AuthControls'
import AuthControlsLoading from '@/features/auth/components/AuthControlsLoading'

const Header = () => {
  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between" aria-label="Main navigation">
          {/* Logo / App Name */}
          <Link to="/" aria-label="Pair Research home" className="text-lg sm:text-xl font-semibold">
            Pair Research
          </Link>

          {/* Auth Controls */}
          <Suspense fallback={<AuthControlsLoading />}>
            <AuthControls />
          </Suspense>
        </nav>
      </div>
    </header>
  )
}

export default Header
