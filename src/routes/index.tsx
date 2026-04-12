import { createFileRoute } from '@tanstack/react-router'
import { LifeBuoy, TrendingUp, Users } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex flex-col items-center space-y-12 px-4 pb-8">
      <section className="max-w-3xl text-center">
        <p className="text-2xl font-semibold">
          Pair Research is a collaborative method from Delta Lab, designed to help group members overcome blockers and build teams.
        </p>
      </section>

      <section className="w-full max-w-5xl">
        <img
          src="/images/example.png"
          alt="Illustration of Pair Research features"
          className="h-auto w-full rounded-lg shadow-md"
        />
      </section>

      <section className="w-full max-w-4xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow">
            <LifeBuoy className="mb-4 h-12 w-12 text-blue-500" aria-hidden="true" />
            <h3 className="mb-2 text-lg font-semibold">Overcome Blockers</h3>
            <p className="text-sm text-gray-600">
              Match together group members with appropriate skills to help each other.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow">
            <TrendingUp className="mb-4 h-12 w-12 text-green-500" aria-hidden="true" />
            <h3 className="mb-2 text-lg font-semibold">Increase Productivity</h3>
            <p className="text-sm text-gray-600">
              You&apos;ll work faster if you can just get past those blockers.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow">
            <Users className="mb-4 h-12 w-12 text-purple-500" aria-hidden="true" />
            <h3 className="mb-2 text-lg font-semibold">Collaborate Effectively</h3>
            <p className="text-sm text-gray-600">
              Encourage pairings and helping between different sorts of people in your group.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full max-w-4xl space-y-6 text-center">
        <img
          src="/images/delta.jpg"
          alt="Delta Lab logo"
          className="mx-auto h-6 w-auto"
        />
        <p className="text-sm">
          Interested in learning more about the research that drives Pair Research?
          {' '}
          <a
            href="http://users.eecs.northwestern.edu/~hq/papers/pairresearch.pdf"
            className="text-blue-500 underline-interactive"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the original paper here.
          </a>
        </p>
        <p className="text-sm text-gray-600">
          Pair Research is made possible through the generous support of the
          {' '}
          <a
            href="http://www.northwestern.edu/provost/faculty-honors/digital-learning-fellowships/index.html"
            className="text-blue-500 underline-interactive"
            target="_blank"
            rel="noopener noreferrer"
          >
            Northwestern Office of the Provost Digital Learning Award
          </a>
          {' '}
          and an
          {' '}
          <a
            href="http://www.nsf.gov/awardsearch/showAward?AWD_ID=1623635"
            className="text-blue-500 underline-interactive"
            target="_blank"
            rel="noopener noreferrer"
          >
            NSF Cyberlearning Award
          </a>
          .
        </p>
      </section>
    </div>
  )
}
