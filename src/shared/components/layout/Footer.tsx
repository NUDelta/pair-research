import { Heart } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="animate-subtle-rise border-t">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
        <p className="flex items-center">
          Made with
          <Heart className="inline mx-1 h-4 w-4 text-red-400 transition-transform duration-300 ease-out motion-safe:hover:scale-110" aria-hidden="true" />
          by
          <a
            href="http://delta.northwestern.edu/"
            className="ml-1.5 text-blue-500 underline-interactive transition-[color,transform] duration-300 ease-out hover:-translate-y-0.5"
            aria-label="Delta Lab Website"
            target="_blank"
            rel="noopener noreferrer"
          >
            Delta Lab
          </a>
        </p>
        <p className="flex-col text-center">
          Questions? Comments? Bug reports?
          <a
            href="/contact"
            className="ml-1.5 text-blue-500 underline-interactive transition-[color,transform] duration-300 ease-out hover:-translate-y-0.5"
            aria-label="Send us a message"
          >
            Send us a message.
          </a>
        </p>
      </div>
    </footer>
  )
}

export default Footer
