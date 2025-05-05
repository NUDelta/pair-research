import { LifeBuoy, TrendingUp, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import deltaLogo from '../../public/images/delta.jpg'
import exampleImage from '../../public/images/example.png'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center space-y-12 px-4 pb-8">
      {/* Top description */}
      <section className="max-w-3xl text-center">
        <p className="text-2xl font-semibold">
          Pair Research is a collaborative method from Delta Lab, designed to help group members overcome blockers and build teams.
        </p>
      </section>

      {/* Example image */}
      <section className="w-full max-w-5xl">
        <Image
          src={exampleImage}
          alt="Illustration of Pair Research features"
          className="w-full h-auto rounded-lg shadow-md"
          priority
        />
      </section>

      {/* Features grid */}
      <section className="w-full max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow">
            <LifeBuoy className="w-12 h-12 mb-4 text-blue-500" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">Overcome Blockers</h3>
            <p className="text-sm text-gray-600">
              Match together group members with appropriate skills to help each other.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow">
            <TrendingUp className="w-12 h-12 mb-4 text-green-500" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">Increase Productivity</h3>
            <p className="text-sm text-gray-600">
              You'll work faster if you can just get past those blockers.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow">
            <Users className="w-12 h-12 mb-4 text-purple-500" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">Collaborate Effectively</h3>
            <p className="text-sm text-gray-600">
              Encourage pairings and helping between different sorts of people in your group.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom section */}
      <section className="w-full max-w-4xl text-center space-y-6">
        <Image
          src={deltaLogo}
          alt="Delta Lab logo"
          className="mx-auto h-6 w-auto"
          priority
        />
        <p className="text-sm">
          Interested in learning more about the research that drives Pair Research?
          {' '}
          <Link
            href="http://users.eecs.northwestern.edu/~hq/papers/pairresearch.pdf"
            className="text-blue-500 underline-interactive"
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
          >
            Read the original paper here.
          </Link>
        </p>
        <p className="text-sm text-gray-600">
          Pair Research is made possible through the generous support of the
          {' '}
          <Link
            href="http://www.northwestern.edu/provost/faculty-honors/digital-learning-fellowships/index.html"
            className="text-blue-500 underline-interactive"
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
          >
            Northwestern Office of the Provost Digital Learning Award
          </Link>
          {' '}
          and an
          {' '}
          <Link
            href="http://www.nsf.gov/awardsearch/showAward?AWD_ID=1623635"
            className="text-blue-500 underline-interactive"
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
          >
            NSF Cyberlearning Award
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
