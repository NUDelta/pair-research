import { Heart } from 'lucide-react'
import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="border-t">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
        <p className="flex items-center">
          Made with
          <Heart className="inline mx-1 w-4 h-4 text-red-400" aria-hidden="true" />
          by
          <Link
            href="http://delta.northwestern.edu/"
            className="ml-1.5 text-blue-500 underline-interactive"
            aria-label="Delta Lab Website"
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
          >
            Delta Lab
          </Link>
        </p>
        <p className="flex-col text-center">
          Questions? Comments? Bug reports?
          <Link
            href="/contact"
            className="ml-1.5 text-blue-500 underline-interactive"
            aria-label="Send us a message"
          >
            Send us a message.
          </Link>
        </p>
      </div>
    </footer>
  )
}

export default Footer
