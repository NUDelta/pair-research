import ContactForm from './ContactForm'

export default function ContactPage() {
  return (
    <main className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <section className="space-y-4 pt-2">
          <p className="text-sm font-medium uppercase text-sky-700">Pair Research</p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Contact</h1>
            <p className="text-sm leading-7 text-slate-600 sm:text-base">
              Send us product questions, bug reports, access issues, or abuse reports. Include enough context for the team to trace what happened.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            For course or lab policy questions, contact the responsible instructor, administrator, or program lead directly.
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <ContactForm />
        </section>
      </div>
    </main>
  )
}
