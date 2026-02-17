import Link from "next/link";
import Image from "next/image";

export function Homepage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ NAVIGATION ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-txt-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[15px] font-extrabold text-txt-900 tracking-tight">Hercules</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-txt-700 hover:bg-surface-100 rounded-lg transition no-underline">
              Sign in
            </Link>
            <Link href="/signup" className="px-5 py-2 text-sm font-semibold text-white bg-txt-900 hover:bg-txt-700 rounded-lg transition no-underline">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-40 pb-24 px-8 text-center relative overflow-hidden" style={{ background: "linear-gradient(180deg, #F8F9FF 0%, #FFFFFF 60%)" }}>
        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(79,107,246,0.06) 0%, transparent 70%)" }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-surface-200 rounded-full text-[13px] font-medium text-txt-500 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Personal coaching platform
          </div>
          <h1 className="font-serif text-[clamp(42px,6vw,72px)] font-bold leading-[1.08] tracking-tight text-txt-900 max-w-[800px] mx-auto mb-6">
            Optimise Your Life<br />to Its <em className="italic text-brand-500">Peak Potential</em>
          </h1>
          <p className="text-lg leading-relaxed text-txt-500 max-w-[560px] mx-auto mb-12">
            A structured one-to-one coaching system with proven mentors to help you set ambitious goals, build powerful habits, and reach your{" "}
            <span className="text-brand-500 font-medium">peak potential</span> across every dimension of life.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-3.5 text-[15px] font-bold text-white bg-txt-900 border-2 border-txt-900 rounded-xl hover:bg-txt-700 hover:border-txt-700 transition no-underline">
              Start Your Journey
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <a href="#pillars" className="inline-flex items-center gap-2 px-8 py-3.5 text-[15px] font-bold text-txt-900 bg-white border-2 border-surface-200 rounded-xl hover:border-txt-400 transition no-underline">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ═══ QUOTE STRIP ═══ */}
      <section className="py-16 px-8 bg-txt-900 text-center">
        <blockquote className="font-serif text-[clamp(20px,3vw,28px)] italic font-normal text-white/90 max-w-[700px] mx-auto leading-relaxed">
          &ldquo;We are what we repeatedly do. Excellence, then, is not an act, but a habit.&rdquo;
        </blockquote>
        <cite className="block mt-5 not-italic text-[13px] font-semibold text-white/40 tracking-widest uppercase">
          Aristotle
        </cite>
      </section>

      {/* ═══ FOUR PILLARS ═══ */}
      <section id="pillars" className="py-24 px-8 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-500 mb-3">The Four Pillars</p>
          <h2 className="font-serif text-[clamp(32px,4vw,44px)] font-bold tracking-tight leading-tight text-txt-900 mb-4">
            Master the 4 Fundamental Pillars to Live Life at{" "}
            <span className="text-brand-500">Peak Potential</span>
          </h2>
          <p className="text-base leading-relaxed text-txt-500 max-w-[520px] mb-14">
            True excellence demands balance. Each pillar represents a dimension of life that must be intentionally cultivated to unlock what you&apos;re truly capable of.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Fitness & Health */}
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-8 hover:border-brand-500 hover:shadow-[0_0_0_1px_var(--color-brand-500)] hover:-translate-y-0.5 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <h3 className="text-[17px] font-bold text-txt-900 mb-2 tracking-tight">Fitness & Health</h3>
              <p className="text-[13.5px] leading-relaxed text-txt-500">Build a body that sustains your ambition. Nutrition, training, sleep and recovery — all tracked towards your peak physical state.</p>
            </div>

            {/* Professional, Business & Finance */}
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-8 hover:border-brand-500 hover:shadow-[0_0_0_1px_var(--color-brand-500)] hover:-translate-y-0.5 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="text-[17px] font-bold text-txt-900 mb-2 tracking-tight">Professional, Business & Finance</h3>
              <p className="text-[13.5px] leading-relaxed text-txt-500">Career growth, business ventures, and financial mastery. Set targets, measure progress, and build wealth systematically.</p>
            </div>

            {/* Relationships & Socials */}
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-8 hover:border-brand-500 hover:shadow-[0_0_0_1px_var(--color-brand-500)] hover:-translate-y-0.5 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <h3 className="text-[17px] font-bold text-txt-900 mb-2 tracking-tight">Relationships & Socials</h3>
              <p className="text-[13.5px] leading-relaxed text-txt-500">Nurture the connections that matter. Family, friendships, networking, and community — the foundation of a fulfilling life.</p>
            </div>

            {/* Spirituality */}
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-8 hover:border-brand-500 hover:shadow-[0_0_0_1px_var(--color-brand-500)] hover:-translate-y-0.5 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-[17px] font-bold text-txt-900 mb-2 tracking-tight">Spirituality & Psychological Wellbeing</h3>
              <p className="text-[13.5px] leading-relaxed text-txt-500">Inner alignment and purpose. Meditation, gratitude, mindfulness and self-reflection — cultivate the clarity that drives everything else.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PHILOSOPHY / QUOTES ═══ */}
      <section className="py-24 px-8" style={{ background: "linear-gradient(180deg, var(--color-surface-50) 0%, white 100%)" }}>
        <div className="max-w-[1000px] mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-500 mb-3">Wisdom Through the Ages</p>
          <h2 className="font-serif text-[clamp(32px,4vw,44px)] font-bold tracking-tight leading-tight text-txt-900 mb-4">
            Achieving <span className="text-brand-500">Peak Potential</span> Through Discipline
          </h2>
          <p className="text-base leading-relaxed text-txt-500 max-w-[520px] mx-auto">
            The greatest minds in history understood that a fulfilled life demands mastery across every dimension — through{" "}
            <span className="text-brand-500 font-medium">discipline, focus, and the relentless pursuit of potential</span>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14">
            {/* Fitness & Health */}
            <div className="bg-white border border-surface-200 rounded-2xl p-9 text-left relative" style={{ borderTop: "3px solid #2563EB" }}>
              <div className="text-[11px] font-bold tracking-widest uppercase text-blue-600 mb-4">Fitness & Health</div>
              <div className="absolute top-3 left-6 font-serif text-7xl text-brand-500/15 leading-none">&ldquo;</div>
              <blockquote className="font-serif text-[17px] italic leading-relaxed text-txt-700 mb-5 relative z-10">
                &ldquo;It is a shame for a man to grow old without seeing the beauty and strength of which his body is capable.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-base flex-shrink-0">&#x1F3DB;</div>
                <div>
                  <div className="text-sm font-bold text-txt-900">Socrates</div>
                  <div className="text-xs text-txt-400 mt-px">Greek Philosopher, 470 &ndash; 399 BC</div>
                </div>
              </div>
            </div>

            {/* Professional, Business & Finance */}
            <div className="bg-white border border-surface-200 rounded-2xl p-9 text-left relative" style={{ borderTop: "3px solid #7C3AED" }}>
              <div className="text-[11px] font-bold tracking-widest uppercase text-purple-600 mb-4">Professional, Business & Finance</div>
              <div className="absolute top-3 left-6 font-serif text-7xl text-brand-500/15 leading-none">&ldquo;</div>
              <blockquote className="font-serif text-[17px] italic leading-relaxed text-txt-700 mb-5 relative z-10">
                &ldquo;Seek wealth, not money or status. Wealth is having assets that earn while you sleep. Financial freedom is about having the leverage to live life on your own terms.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-base flex-shrink-0">&#x2693;</div>
                <div>
                  <div className="text-sm font-bold text-txt-900">Naval Ravikant</div>
                  <div className="text-xs text-txt-400 mt-px">Entrepreneur & Philosopher, b. 1974</div>
                </div>
              </div>
            </div>

            {/* Relationships & Socials */}
            <div className="bg-white border border-surface-200 rounded-2xl p-9 text-left relative" style={{ borderTop: "3px solid #059669" }}>
              <div className="text-[11px] font-bold tracking-widest uppercase text-green-600 mb-4">Relationships & Socials</div>
              <div className="absolute top-3 left-6 font-serif text-7xl text-brand-500/15 leading-none">&ldquo;</div>
              <blockquote className="font-serif text-[17px] italic leading-relaxed text-txt-700 mb-5 relative z-10">
                &ldquo;Man is by nature a social animal. Anyone who either cannot lead the common life or is so self-sufficient as not to need to is either a beast or a god.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-base flex-shrink-0">&#x1F3DB;</div>
                <div>
                  <div className="text-sm font-bold text-txt-900">Aristotle</div>
                  <div className="text-xs text-txt-400 mt-px">Greek Philosopher, 384 &ndash; 322 BC</div>
                </div>
              </div>
            </div>

            {/* Spirituality */}
            <div className="bg-white border border-surface-200 rounded-2xl p-9 text-left relative" style={{ borderTop: "3px solid #D97706" }}>
              <div className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-4">Spirituality & Psychological Wellbeing</div>
              <div className="absolute top-3 left-6 font-serif text-7xl text-brand-500/15 leading-none">&ldquo;</div>
              <blockquote className="font-serif text-[17px] italic leading-relaxed text-txt-700 mb-5 relative z-10">
                &ldquo;Knowledge without action is vanity, and action without knowledge is insanity. The soul must be disciplined through reflection to reach its highest station.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-base flex-shrink-0">&#x2728;</div>
                <div>
                  <div className="text-sm font-bold text-txt-900">Al-Ghazali</div>
                  <div className="text-xs text-txt-400 mt-px">Philosopher & Theologian, 1058 &ndash; 1111</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-500 mb-3">How It Works</p>
          <h2 className="font-serif text-[clamp(32px,4vw,44px)] font-bold tracking-tight leading-tight text-txt-900 mb-4">
            Simple. Structured. <span className="text-brand-500">Powerful.</span>
          </h2>
          <p className="text-base leading-relaxed text-txt-500 max-w-[520px] mx-auto">
            A one-to-one coaching system designed to take you to{" "}
            <span className="text-brand-500 font-medium">peak potential</span> — not busywork.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mt-14">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-txt-900 text-white flex items-center justify-center text-lg font-extrabold mx-auto mb-5">1</div>
              <h3 className="text-[17px] font-bold text-txt-900 mb-2">Set 3-Year Goals</h3>
              <p className="text-sm leading-relaxed text-txt-500">Define ambitious goals across all four pillars. Your coach helps you think bigger and create a clear roadmap.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-txt-900 text-white flex items-center justify-center text-lg font-extrabold mx-auto mb-5">2</div>
              <h3 className="text-[17px] font-bold text-txt-900 mb-2">Break Into Weekly Actions</h3>
              <p className="text-sm leading-relaxed text-txt-500">Turn long-term vision into weekly actionable targets. Small steps, consistent progress, compounding results.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-txt-900 text-white flex items-center justify-center text-lg font-extrabold mx-auto mb-5">3</div>
              <h3 className="text-[17px] font-bold text-txt-900 mb-2">Check In & Adjust</h3>
              <p className="text-sm leading-relaxed text-txt-500">Regular check-ins with your coach keep you accountable, celebrate wins, and adapt the plan as you grow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOUNDER / COACH ═══ */}
      <section id="coach" className="py-24 px-8 bg-surface-50">
        <div className="max-w-[900px] mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-shrink-0 w-[280px] h-[280px] rounded-2xl overflow-hidden relative">
            <Image
              src="/waheed.jpg"
              alt="Waheed Nabeel"
              fill
              className="object-cover"
              sizes="280px"
              priority
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-500 mb-2">Your Coach</p>
            <h2 className="font-serif text-4xl font-bold text-txt-900 mb-1.5 tracking-tight">Waheed Nabeel</h2>
            <p className="text-sm text-brand-500 font-semibold mb-5">Founder, Innovation Civilization Podcast &bull; Investor</p>
            <p className="text-[15px] leading-relaxed text-txt-500 mb-6">
              With a deep passion for human <span className="text-brand-500 font-medium">potential</span> and a track record in business and innovation, Waheed helps ambitious individuals design and execute a life strategy that maximises every dimension — health, wealth, relationships, and purpose.
            </p>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <a
                href="https://www.linkedin.com/in/iwaheed/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-lg hover:bg-[#004182] transition no-underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                Connect on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 px-8 text-center bg-txt-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(79,107,246,0.12) 0%, transparent 70%)" }} />
        <h2 className="font-serif text-[clamp(32px,4vw,48px)] font-bold text-white mb-4 tracking-tight relative">
          Ready to Reach Your<br /><span className="text-brand-500">Peak Potential</span>?
        </h2>
        <p className="text-[17px] text-white/50 mb-10 relative">Join Hercules and start building the life you were meant to live.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 px-9 py-4 bg-white text-txt-900 text-[15px] font-bold rounded-xl hover:-translate-y-0.5 hover:shadow-2xl transition no-underline relative">
          Get Started Free
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </Link>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 px-8 border-t border-surface-200 bg-white text-center">
        <p className="text-[13px] text-txt-400">&copy; 2025 Hercules. All rights reserved. Built to help you reach your peak potential.</p>
      </footer>
    </div>
  );
}
