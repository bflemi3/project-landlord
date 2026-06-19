'use client'

// MARKETING ONLY — do not import into /app/*. Embedded product "mockups" here are
// illustrative marketing UI, deliberately separate from the real product components.
import { type ReactNode, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FadeUp } from '@/components/fade-up'
import { LanguageSwitcher } from '@/components/language-switcher'
import { WaitlistForm } from './waitlist-form'
import { WaitlistModal } from './waitlist-modal'
import { useWaitlist, WaitlistProvider } from './waitlist-context'

export function Landing({ privacyHref }: { privacyHref: string }) {
  const t = useTranslations('landing')

  return (
    <WaitlistProvider>
      <div
        id="top"
        className="dark font-editorial bg-[#141413] text-[#f5f5f4] selection:bg-[#e9408f]/30 selection:text-[#f5f5f4]"
      >
        <StickyNav />
        <div className="relative">
          <div className="mx-auto max-w-3xl">
            <Nav />
            <Hero
              eyebrow={t('heroEyebrow')}
              title={t('heroTitle')}
              subtitle={t('heroSubtitle')}
              ctaSecondary={t('heroCtaSecondary')}
              tenantLine={t('heroTenantLine')}
              tenantCta={t('ctaTenantCta')}
              peekPeriod={t('heroPeekTitle')}
              peekRent={t('heroPeekRent')}
              peekCondo={t('heroPeekCondo')}
              peekUtility={t('heroPeekUtility')}
              statusPaid={t('heroPeekStatusPaid')}
              statusDue={t('heroPeekStatusDue')}
              statusAwaiting={t('p1StatusAwaiting')}
              detectedYesterday={t('heroPeekDetectedYesterday')}
            />
          </div>
          <JobsGrid />
          <HowItWorks />
          <Pillar1 />
          <Pillar2 />
          <Communication />
          <RevenueMoment />
          <Pillar3 />
          <Comparison />
          <Pricing />
          <TwoSides />
          <TrustBand />
          <Founder />
          <Faq privacyHref={privacyHref} />
          <div className="mx-auto max-w-3xl">
            <FinalCta title={t('ctaTitle')} subtitle={t('ctaSubtitle')} />
            <Footer
              copyright={t('footerCopyright')}
              privacy={t('footerPrivacy')}
              privacyHref={privacyHref}
            />
          </div>
        </div>
      </div>
      <WaitlistModal />
    </WaitlistProvider>
  )
}

function StickyNav() {
  const t = useTranslations('landing')
  const [active, setActive] = useState('')
  const [pinned, setPinned] = useState(false)
  const links = [
    { id: 'how-it-works', label: t('navHowItWorks'), shortLabel: t('navHowItWorksShort') },
    { id: 'pricing', label: t('navPricing'), shortLabel: t('navPricing') },
    { id: 'faq', label: t('navFaq'), shortLabel: t('navFaq') },
  ]
  useEffect(() => {
    // Active = the last nav section whose top has passed the viewport midline. Computed from live
    // positions so it's correct *on load* too — an IntersectionObserver only fires on crossings, so
    // reloading mid-section would never highlight. The read is rAF-throttled and only touches three
    // elements, so it stays cheap. "How it works" owns everything from its section until Pricing.
    const navSections = ['how-it-works', 'pricing', 'faq']
    let raf = 0
    const update = () => {
      raf = 0
      const line = window.innerHeight * 0.5
      let current = ''
      for (const id of navSections) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      // Once the final CTA crosses the midline we're past every nav section — clear the highlight.
      const cta = document.getElementById('waitlist')
      if (cta && cta.getBoundingClientRect().top <= line) current = ''
      setActive(current)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
  // Mobile: the bar is hidden on load (the header alone is enough), then revealed once the header
  // scrolls out of view. Where scroll-timeline is supported, the .nav-reveal CSS animation fades it
  // in (compositor, no JS); this observer is the fallback that toggles it where unsupported.
  useEffect(() => {
    const header = document.getElementById('site-nav')
    if (!header) return
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting), {
      rootMargin: '-24px 0px 0px 0px',
    })
    observer.observe(header)
    return () => observer.disconnect()
  }, [])
  return (
    <nav
      className={`nav-reveal pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 transition-opacity duration-300 ease-out sm:top-5 sm:opacity-100 ${
        pinned ? 'opacity-100' : 'opacity-0'
      }`}
      aria-label={t('navAriaLabel')}
    >
      <div
        className={`flex w-full max-w-md items-center justify-between gap-1 rounded-full border border-white/[0.10] bg-[#1a1a19]/80 px-1.5 py-1.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md sm:pointer-events-auto sm:w-auto sm:justify-center ${
          pinned ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-0.5 whitespace-nowrap">
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              aria-current={active === l.id ? 'true' : undefined}
              className={
                active === l.id
                  ? 'rounded-full bg-white/[0.06] px-2.5 py-1.5 text-sm font-medium text-[#f5f5f4] sm:px-3.5 sm:text-[13px]'
                  : 'rounded-full px-2.5 py-1.5 text-sm font-medium text-[#a8a29e] transition-colors hover:text-[#f5f5f4] sm:px-3.5 sm:text-[13px]'
              }
            >
              <span className="sm:hidden">{l.shortLabel}</span>
              <span className="hidden sm:inline">{l.label}</span>
            </a>
          ))}
        </div>
        <WaitlistCta variant="nav" />
      </div>
    </nav>
  )
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/**
 * The "Join the waitlist" CTA. Once the visitor has joined (this session or a
 * remembered prior visit), it swaps to a quiet confirmed state instead of a
 * loud action — still anchored to #waitlist so a click scrolls to the
 * confirmation card. One component so the swap lives in a single place.
 */
function WaitlistCta({ variant }: { variant: 'nav' | 'hero' | 'pricing' }) {
  const t = useTranslations('landing')
  const { submitted } = useWaitlist()

  if (submitted) {
    if (variant === 'nav') {
      return (
        <a
          href="#waitlist"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e9408f]/30 px-3.5 py-1.5 text-sm font-medium text-[#f0a4c5] transition-colors hover:border-[#e9408f]/55 sm:px-4 sm:text-[13px]"
        >
          <CheckMark />
          {t('ctaJoinedShort')}
        </a>
      )
    }
    return (
      <a
        href="#waitlist"
        className={`inline-flex items-center gap-2.5 text-[14px] font-medium text-[#f5f5f4] ${
          variant === 'pricing' ? 'mt-7 w-full justify-center' : ''
        }`}
      >
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#e9408f]/15 text-[#e9408f]">
          <CheckMark />
        </span>
        {t('ctaJoined')}
      </a>
    )
  }

  if (variant === 'nav') {
    return (
      <a
        href="#waitlist"
        className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f5f0e8] px-3.5 py-1.5 text-sm font-medium text-[#1c1917] transition-colors hover:bg-[#ebe5d9] sm:px-4 sm:text-[13px]"
      >
        <span>{t('navJoinShort')}</span>
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </a>
    )
  }
  return (
    <a
      href="#waitlist"
      className={`group inline-flex items-center gap-2 rounded-full bg-[#f5f0e8] px-6 py-3 text-[14px] font-medium text-[#1c1917] transition-colors hover:bg-[#ebe5d9] ${
        variant === 'pricing' ? 'mt-7 w-full justify-center' : ''
      }`}
    >
      {t('heroCtaPrimary')}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </a>
  )
}

function Nav() {
  const t = useTranslations('landing')
  return (
    <nav id="site-nav" className="relative z-20 flex items-center px-6 py-6">
      <a
        href="#top"
        aria-label={t('navHome')}
        className="font-display rounded-sm text-[22px] font-semibold tracking-tight text-[#f5f5f4] transition-opacity hover:opacity-80"
      >
        mabenn
      </a>
    </nav>
  )
}

type HeroProps = {
  eyebrow: string
  title: string
  subtitle: string
  ctaSecondary: string
  tenantLine: string
  tenantCta: string
  peekPeriod: string
  peekRent: string
  peekCondo: string
  peekUtility: string
  statusPaid: string
  statusDue: string
  statusAwaiting: string
  detectedYesterday: string
}

function Hero(props: HeroProps) {
  const { setRole, submitted } = useWaitlist()
  return (
    <section className="relative px-6 pt-10 pb-24 md:pt-16 md:pb-32">
      <HeroGlow />
      <div className="relative z-10">
        <FadeUp delay={0.06}>
          <p className="text-[12.5px] font-medium tracking-[0.16em] text-[#f0a4c5] uppercase">
            {props.eyebrow}
          </p>
        </FadeUp>
        <FadeUp delay={0.12}>
          <h1 className="font-display mt-5 max-w-[16ch] text-[44px] leading-[1.04] font-medium tracking-[-0.02em] text-[#f5f5f4] md:text-[64px]">
            {props.title}
          </h1>
        </FadeUp>
        <FadeUp delay={0.32}>
          <p className="mt-7 max-w-[46ch] text-[17px] leading-[1.55] text-[#a8a29e] md:text-[18px]">
            {props.subtitle}
          </p>
        </FadeUp>
        <FadeUp delay={0.44}>
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
            <WaitlistCta variant="hero" />
            {/* Hairline divider so the confirmation (a status) reads separately from "See how" (an action). */}
            {submitted && <span aria-hidden className="h-4 w-px shrink-0 bg-white/15" />}
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-[#f5f5f4] transition-opacity hover:opacity-80"
            >
              {props.ctaSecondary}
              <span
                aria-hidden
                className="text-[#a8a29e] transition-transform group-hover:translate-x-0.5"
              >
                ↗
              </span>
            </a>
          </div>
        </FadeUp>
        {/* One email = one role, so the tenant nudge is moot once they've joined. */}
        {!submitted && (
          <FadeUp delay={0.56}>
            <p className="mt-6 text-[14px] leading-[1.55] text-[#78716c]">
              {props.tenantLine}{' '}
              <a
                href="#waitlist"
                onClick={() => setRole('tenant')}
                className="font-medium text-[#d6d3d1] underline-offset-4 transition-colors hover:text-[#f5f5f4]"
              >
                {props.tenantCta}
              </a>
            </p>
          </FadeUp>
        )}
        <FadeUp delay={0.58}>
          <div className="scrollbar-hide -mr-6 overflow-x-auto overflow-y-clip lg:mr-0 lg:overflow-visible">
            <div className="w-[760px] pr-6 lg:w-auto lg:pr-0">
              <HeroPeek
                period={props.peekPeriod}
                rent={props.peekRent}
                condo={props.peekCondo}
                utility={props.peekUtility}
                statusPaid={props.statusPaid}
                statusDue={props.statusDue}
                statusAwaiting={props.statusAwaiting}
                detectedYesterday={props.detectedYesterday}
              />
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

function HeroGlow() {
  return (
    <div className="pointer-events-none absolute -inset-20 -right-60 -left-60" aria-hidden>
      <div
        className="absolute h-[200px] w-[450px] rounded-full blur-[60px]"
        style={{
          left: 'calc(15% + 24px)',
          top: '15%',
          background: 'radial-gradient(ellipse, rgba(233,64,143,0.42) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute h-[350px] w-[700px] rounded-full blur-[90px]"
        style={{
          left: '10%',
          top: '5%',
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(233,64,143,0.22) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute h-[500px] w-[1100px] rounded-full blur-[130px]"
        style={{
          left: '-5%',
          top: '-5%',
          background:
            'radial-gradient(ellipse at 35% 50%, rgba(233,64,143,0.10) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

type HeroPeekProps = {
  period: string
  rent: string
  condo: string
  utility: string
  statusPaid: string
  statusDue: string
  statusAwaiting: string
  detectedYesterday: string
}

function HeroPeek(props: HeroPeekProps) {
  const t = useTranslations('landing')
  return (
    <div className="relative mt-16" aria-hidden>
      <div
        className="absolute -inset-x-12 -inset-y-8 rounded-[44px] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(233,64,143,0.16) 0%, rgba(233,64,143,0.04) 50%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="relative h-[440px] overflow-hidden rounded-[32px] border border-white/[0.12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background: 'linear-gradient(150deg, #3a312b 0%, #2b2521 25%, #1d1916 60%, #141110 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 0% 0%, rgba(233,64,143,0.14) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 70% at 100% 100%, rgba(0,0,0,0.5) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="absolute top-10 right-[-40px] left-8 overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
          <PeekTabs />
          <PeekHeader period={props.period} />
          <PeekAggregate />
          <div className="px-6">
            <PeekRow
              label={props.rent}
              date={t('dateApr5')}
              amount="R$ 2.800"
              status={props.statusPaid}
              statusVariant="paid"
              note={props.detectedYesterday}
              spotlight
            />
            <PeekRow
              label={props.condo}
              date={t('dateApr10')}
              amount="R$ 480"
              status={props.statusPaid}
              statusVariant="paid"
            />
            <PeekRow
              label={props.utility}
              date={t('dateApr15')}
              amount="R$ 320"
              status={props.statusDue}
              statusVariant="due"
            />
            <PeekRow
              label="Água · Sabesp"
              date={t('dateApr20')}
              amount="R$ 95"
              status={props.statusAwaiting}
              statusVariant="muted"
            />
            <PeekRow
              label="Internet · Vivo"
              date={t('dateApr25')}
              amount="R$ 165"
              status={props.statusAwaiting}
              statusVariant="muted"
            />
            <PeekRow
              label="IPTU · Prefeitura SP"
              date={t('dateApr28')}
              amount="R$ 240"
              status={props.statusAwaiting}
              statusVariant="muted"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage: 'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, transparent 58%, rgba(15,13,12,0.42) 84%, rgba(15,13,12,0.72) 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 80%, rgba(15,13,12,0.30) 100%)',
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}

function PeekTabs() {
  const t = useTranslations('landing')
  const tabs = [
    { label: t('peekTabAll'), active: true },
    { label: t('peekTabRent') },
    { label: t('peekTabBills') },
    { label: t('peekTabContract') },
  ]
  return (
    <div className="flex items-center gap-1 border-b border-white/[0.05] px-4 pt-3 pb-0">
      {tabs.map((tab) => (
        <span
          key={tab.label}
          className={
            tab.active
              ? 'relative px-3 py-2 text-[12px] font-medium text-[#f5f5f4] after:absolute after:inset-x-3 after:-bottom-px after:h-px after:bg-[#f5f5f4]'
              : 'px-3 py-2 text-[12px] font-medium text-[#78716c]'
          }
        >
          {tab.label}
        </span>
      ))}
      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#78716c]" aria-hidden>
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
        </span>
        <span>{t('peekLiveLabel')}</span>
      </div>
    </div>
  )
}

function PeekHeader({ period }: { period: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/[0.05] px-6 py-4">
      <div className="flex items-baseline gap-2.5">
        <p className="font-display text-[18px] font-medium tracking-tight text-[#f5f5f4]">
          Apt 23B
        </p>
        <p className="text-[12.5px] text-[#78716c]">Vila Mariana · São Paulo</p>
      </div>
      <p className="text-[12.5px] text-[#a8a29e]">{period}</p>
    </div>
  )
}

function PeekAggregate() {
  const t = useTranslations('landing')
  return (
    <div className="grid grid-cols-3 border-b border-white/[0.05]">
      <AggregateCell label={t('peekAggregateExpected')} value="R$ 4.350" />
      <AggregateCell label={t('peekAggregatePaid')} value="R$ 3.280" emphasis />
      <AggregateCell label={t('peekAggregatePending')} value="R$ 1.070" />
    </div>
  )
}

function AggregateCell({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="border-r border-white/[0.05] px-6 py-3.5 last:border-r-0">
      <p className="text-[10.5px] tracking-[0.12em] text-[#78716c] uppercase">{label}</p>
      <p
        className={
          emphasis
            ? 'mt-1 font-mono text-[16px] font-medium text-[#f5f5f4] tabular-nums'
            : 'mt-1 font-mono text-[16px] text-[#a8a29e] tabular-nums'
        }
      >
        {value}
      </p>
    </div>
  )
}

function PeekRow({
  label,
  date,
  amount,
  status,
  statusVariant,
  note,
  spotlight,
}: {
  label: string
  date?: string
  amount: string
  status: string
  statusVariant: 'paid' | 'due' | 'muted'
  note?: string
  spotlight?: boolean
}) {
  return (
    <div className="flex items-center gap-3 border-t border-white/[0.04] py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-[13.5px] text-[#f5f5f4]">{label}</p>
          {date ? <span className="text-[11.5px] text-[#78716c]">· {date}</span> : null}
        </div>
        {note ? <p className="mt-0.5 text-[11px] text-[#78716c]">{note}</p> : null}
      </div>
      <p className="w-[88px] shrink-0 text-right font-mono text-[13px] text-[#d6d3d1] tabular-nums">
        {amount}
      </p>
      <div className="w-[100px] shrink-0 text-right">
        <StatusPill status={status} variant={statusVariant} spotlight={spotlight} />
      </div>
    </div>
  )
}

function StatusPill({
  status,
  variant,
  spotlight,
}: {
  status: string
  variant: 'paid' | 'due' | 'muted'
  spotlight?: boolean
}) {
  if (variant === 'paid') {
    return (
      <span
        className={
          spotlight
            ? 'relative inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 ring-2 ring-[#e9408f]/40 ring-offset-2 ring-offset-[#1a1a19]'
            : 'inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300'
        }
      >
        <span className="size-1.5 rounded-full bg-emerald-400" />
        {status}
      </span>
    )
  }
  if (variant === 'due') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-400" />
        {status}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-[#a8a29e]">
      <span className="size-1.5 rounded-full bg-[#78716c]" />
      {status}
    </span>
  )
}

function JobsGrid() {
  const t = useTranslations('landing')
  const cards = [
    { title: t('jobMoneyTitle'), body: t('jobMoneyBody') },
    { title: t('jobReportingTitle'), body: t('jobReportingBody') },
    { title: t('jobContractsTitle'), body: t('jobContractsBody') },
    { title: t('jobMaintenanceTitle'), body: t('jobMaintenanceBody') },
    { title: t('jobMessagesTitle'), body: t('jobMessagesBody') },
    { title: t('jobRecordTitle'), body: t('jobRecordBody') },
  ]
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <FadeUp delay={0.05}>
          <h2 className="font-display max-w-[22ch] text-[32px] leading-[1.08] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
            {t('jobsHeadline')}
          </h2>
        </FadeUp>
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, idx) => (
            <JobCard key={c.title} index={idx} title={c.title} body={c.body} />
          ))}
        </div>
      </div>
    </section>
  )
}

function JobCard({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <FadeUp delay={0.1 + index * 0.06}>
      <div>
        <p className="text-[16px] font-medium text-[#f5f5f4]">{title}</p>
        <p className="mt-2 text-[14.5px] leading-[1.6] text-[#a8a29e]">{body}</p>
      </div>
    </FadeUp>
  )
}

function HowItWorks() {
  const t = useTranslations('landing')
  const steps = [
    { title: t('hiwStep1Title'), body: t('hiwStep1Body') },
    { title: t('hiwStep2Title'), body: t('hiwStep2Body') },
    { title: t('hiwStep3Title'), body: t('hiwStep3Body') },
    { title: t('hiwStep4Title'), body: t('hiwStep4Body') },
  ]
  return (
    <section className="relative border-y border-white/[0.06] bg-white/[0.015] px-6 py-24 md:py-32">
      <div id="how-it-works" className="mx-auto max-w-5xl">
        <FadeUp delay={0.05}>
          <h2 className="font-display max-w-[20ch] text-[32px] leading-[1.08] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
            {t('hiwHeadline')}
          </h2>
        </FadeUp>
        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-4">
          {steps.map((s, idx) => (
            <HowItWorksStep key={s.title} index={idx} title={s.title} body={s.body} />
          ))}
        </div>
        <FadeUp delay={0.4}>
          <div className="mt-12 flex max-w-[64ch] items-stretch gap-4">
            <span className="flex shrink-0 items-start text-[#e9408f]/40" aria-hidden>
              <svg viewBox="0 0 16 16" className="size-7">
                <path
                  d="M8 2 12.5 3.8V8c0 3.3-2.4 5.3-4.5 6.2C5.9 13.3 3.5 11.3 3.5 8V3.8Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 8 7.4 9.4 10.2 6.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-[14px] leading-[1.6] text-[#a8a29e]">{t('hiwBankNote')}</p>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

function HowItWorksStep({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <FadeUp delay={0.1 + index * 0.08}>
      <div className="relative border-t border-white/[0.12] pt-5 before:absolute before:-top-px before:left-0 before:h-[2px] before:w-8 before:bg-[#e9408f]">
        <span className="font-mono text-[11px] text-[#78716c] tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <p className="mt-3 text-[16px] font-medium text-[#f5f5f4]">{title}</p>
        <p className="mt-2 text-[14.5px] leading-[1.6] text-[#a8a29e]">{body}</p>
      </div>
    </FadeUp>
  )
}

function Founder() {
  const t = useTranslations('landing')
  return (
    <section id="founders" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,_5fr)_minmax(0,_6fr)] md:gap-14">
          <FadeUp delay={0.05}>
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-10 opacity-90 blur-3xl"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(233,64,143,0.35) 0%, rgba(233,64,143,0.16) 55%, transparent 82%)',
                }}
                aria-hidden
              />
              <Image
                src="/founders.jpg"
                alt={t('founderPhotoAlt')}
                width={1280}
                height={720}
                sizes="(min-width: 768px) 42vw, 100vw"
                className="relative h-auto w-full object-cover"
                style={{
                  maskImage: 'radial-gradient(ellipse at 50% 52%, #000 44%, transparent 86%)',
                  WebkitMaskImage: 'radial-gradient(ellipse at 50% 52%, #000 44%, transparent 86%)',
                }}
              />
            </div>
          </FadeUp>
          <FadeUp delay={0.16}>
            <div>
              <h2 className="font-display text-[30px] leading-[1.1] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[38px]">
                {t('founderHeadline')}
              </h2>
              <div className="mt-6 space-y-5 text-[15.5px] leading-[1.65] text-[#a8a29e]">
                <p>{t('founderBody1')}</p>
                <p>{t('founderBody2')}</p>
                <p>{t('founderBody3')}</p>
              </div>
              <p className="font-display mt-6 text-[15px] font-medium text-[#f5f5f4]">
                {t('founderSignature')}
              </p>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

function Faq({ privacyHref }: { privacyHref: string }) {
  const t = useTranslations('landing')
  const { setRole, submitted } = useWaitlist()
  const items: Array<{ q: string; a: string; linkHref?: string; linkLabel?: string }> = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
    { q: t('faqQ7'), a: t('faqA7') },
    // Drop the tenant waitlist CTA once they've joined — one email = one role.
    {
      q: t('faqQ8'),
      a: t('faqA8'),
      ...(submitted ? {} : { linkHref: '#waitlist', linkLabel: t('ctaTenantCta') }),
    },
    { q: t('faqQ9'), a: t('faqA9') },
    { q: t('faqQ10'), a: t('faqA10') },
    { q: t('faqQ11'), a: t('faqA11'), linkHref: privacyHref, linkLabel: t('faqPrivacyLink') },
    { q: t('faqQ12'), a: t('faqA12') },
  ]
  return (
    <section className="relative px-6 py-32 md:py-40">
      <div id="faq" className="mx-auto max-w-4xl">
        <FadeUp delay={0.05}>
          <h2 className="font-display text-center text-[36px] leading-[1.05] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[48px]">
            {t('faqHeadline')}
          </h2>
        </FadeUp>
        <FadeUp delay={0.18}>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {items.map((item) => (
              <FaqItem
                key={item.q}
                q={item.q}
                a={item.a}
                linkHref={item.linkHref}
                linkLabel={item.linkLabel}
                onLinkClick={item.linkHref === '#waitlist' ? () => setRole('tenant') : undefined}
              />
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

function FaqItem({
  q,
  a,
  linkHref,
  linkLabel,
  onLinkClick,
}: {
  q: string
  a: string
  linkHref?: string
  linkLabel?: string
  onLinkClick?: () => void
}) {
  const linkClass =
    'mt-2 inline-block text-[13.5px] font-medium text-[#d6d3d1] underline-offset-4 transition-colors hover:text-[#f5f5f4]'
  return (
    <div>
      <p className="text-[15.5px] leading-[1.4] font-medium text-[#f5f5f4]">{q}</p>
      <p className="mt-2 text-[14.5px] leading-[1.6] text-[#a8a29e]">{a}</p>
      {linkHref && linkLabel ? (
        linkHref.startsWith('#') ? (
          <a href={linkHref} onClick={onLinkClick} className={linkClass}>
            {linkLabel}
          </a>
        ) : (
          <Link href={linkHref} className={linkClass}>
            {linkLabel}
          </Link>
        )
      ) : null}
    </div>
  )
}

function TrustBand() {
  const t = useTranslations('landing')
  return (
    <section
      id="trust"
      className="relative border-y border-white/[0.06] bg-white/[0.015] px-6 py-16 md:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <FadeUp delay={0.05}>
          <p className="text-center text-[11.5px] font-medium tracking-[0.18em] text-[#a8a29e] uppercase">
            {t('trustEyebrow')}
          </p>
        </FadeUp>
        <FadeUp delay={0.16}>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-12">
            <TrustChip
              label={t('trustChip1Label')}
              body={t('trustChip1Body')}
              icon={
                <svg viewBox="0 0 16 16" className="size-[18px]" aria-hidden>
                  <circle
                    cx="8"
                    cy="6.2"
                    r="3.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5.5 8.3 8 13.4 10.5 8.3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
            <TrustChip
              label={t('trustChip2Label')}
              body={t('trustChip2Body')}
              icon={
                <svg viewBox="0 0 16 16" className="size-[18px]" aria-hidden>
                  <path
                    d="M8 2 12.5 3.8V8c0 3.3-2.4 5.3-4.5 6.2C5.9 13.3 3.5 11.3 3.5 8V3.8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 8 7.4 9.4 10.2 6.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
            <TrustChip
              label={t('trustChip3Label')}
              body={t('trustChip3Body')}
              icon={
                <svg viewBox="0 0 16 16" className="size-[18px]" aria-hidden>
                  <path
                    d="M1.8 8C3.3 5.4 5.4 4 8 4s4.7 1.4 6.2 4c-1.5 2.6-3.6 4-6.2 4S3.3 10.6 1.8 8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="1.9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              }
            />
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

function TrustChip({ icon, label, body }: { icon: React.ReactNode; label: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center md:items-start md:text-left">
      <span
        className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[#a8a29e]"
        aria-hidden
      >
        {icon}
      </span>
      <p className="mt-4 text-[11.5px] font-medium tracking-[0.14em] text-[#78716c] uppercase">
        {label}
      </p>
      <p className="mt-2 text-[15px] leading-[1.55] text-[#a8a29e]">{body}</p>
    </div>
  )
}

function FinalCta({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section id="waitlist" className="relative px-6 py-24 md:py-32">
      <FinalCtaGlow />
      <div className="relative z-10 text-center">
        <FadeUp delay={0.05}>
          <h2 className="font-display mx-auto max-w-[18ch] text-[40px] leading-[1.05] font-medium tracking-[-0.02em] text-[#f5f5f4] md:text-[52px]">
            {title}
          </h2>
        </FadeUp>
        <FadeUp delay={0.18}>
          <p className="mx-auto mt-5 max-w-[42ch] text-[16px] leading-[1.55] text-[#a8a29e]">
            {subtitle}
          </p>
        </FadeUp>
        <FadeUp delay={0.3}>
          <div className="mx-auto mt-10 max-w-md">
            <WaitlistForm />
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

function FinalCtaGlow() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute top-1/3 left-1/2 h-[440px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-[100px]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(233,64,143,0.5) 0%, rgba(233,64,143,0.18) 42%, rgba(233,64,143,0) 72%)',
        }}
      />
    </div>
  )
}

function Footer({
  copyright,
  privacy,
  privacyHref,
}: {
  copyright: string
  privacy: string
  privacyHref: string
}) {
  return (
    <footer className="relative border-t border-white/[0.06] px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[14px] font-medium tracking-tight text-[#f5f5f4]">
            mabenn
          </span>
          <span className="text-[11px] text-[#78716c]">{copyright}</span>
        </div>
        <nav className="flex items-center gap-5 text-[12.5px] text-[#a8a29e]">
          <Link href={privacyHref} className="transition-colors hover:text-[#f5f5f4]">
            {privacy}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  )
}

function Pillar1() {
  const t = useTranslations('landing')
  return (
    <section className="relative py-24 md:py-32">
      <div id="pillar-1" className="mx-auto max-w-6xl lg:px-6">
        <div className="grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,_5fr)_minmax(0,_7fr)] lg:items-start">
          <div className="px-6 lg:px-0">
            <Pillar1Copy
              label={t('p1Label')}
              headline={t('p1Headline')}
              body1={t('p1Body1')}
              body2={t('p1Body2')}
              closer={t('p1Closer')}
            />
          </div>
          <div className="scrollbar-hide overflow-x-auto overflow-y-clip lg:sticky lg:top-24 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <Pillar1Mockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pillar1Copy({
  label,
  headline,
  body1,
  body2,
  closer,
}: {
  label: string
  headline: string
  body1: string
  body2: string
  closer: string
}) {
  return (
    <div className="relative">
      <p className="font-mono text-[12px] text-[#78716c] tabular-nums">{label}</p>
      <h2 className="font-display mt-4 text-[34px] leading-[1.05] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
        {headline}
      </h2>
      <div className="mt-7 space-y-6 text-[15.5px] leading-[1.65] text-[#a8a29e]">
        <p>{body1}</p>
        <p>{body2}</p>
        <p className="font-medium text-[#f5f5f4]">{closer}</p>
      </div>
    </div>
  )
}

function Pillar1Mockup() {
  const t = useTranslations('landing')
  return (
    <div className="relative" aria-hidden>
      <div
        className="absolute -inset-x-12 -inset-y-8 rounded-[44px] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(233,64,143,0.14) 0%, rgba(233,64,143,0.04) 50%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="relative h-[640px] overflow-hidden rounded-[32px] border border-white/[0.12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background: 'linear-gradient(165deg, #3a312b 0%, #2b2521 28%, #1d1916 60%, #141110 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 100% 0%, rgba(233,64,143,0.16) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 70% at 0% 100%, rgba(0,0,0,0.5) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="absolute top-20 right-[-80px] left-16 overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
          <PeekTabs />
          <PeekHeader period="April 2026" />
          <PeekAggregate />
          <div className="px-6">
            <ExpandableRow
              label={t('heroPeekRent')}
              date={t('dateApr5')}
              amount="R$ 2.800"
              status={t('heroPeekStatusPaid')}
              note={t('heroPeekDetectedYesterday')}
              expandedPayer={t('p1ExpandedPayer')}
              expandedMethod={t('p1ExpandedMethod')}
              expandedReference={t('p1ExpandedReference')}
              expandedMatched={t('p1ExpandedMatched')}
            />
            <PeekRow
              label={t('heroPeekCondo')}
              date={t('dateApr10')}
              amount="R$ 480"
              status={t('heroPeekStatusPaid')}
              statusVariant="paid"
            />
            <PeekRow
              label={t('heroPeekUtility')}
              date={t('dateApr15')}
              amount="R$ 320"
              status={t('heroPeekStatusDue')}
              statusVariant="due"
            />
            <PeekRow
              label="Água · Sabesp"
              date={t('dateApr20')}
              amount="R$ 95"
              status={t('p1StatusAwaiting')}
              statusVariant="muted"
            />
            <PeekRow
              label="Internet · Vivo"
              date={t('dateApr25')}
              amount="R$ 165"
              status={t('p1StatusAwaiting')}
              statusVariant="muted"
            />
            <PeekRow
              label="IPTU · Prefeitura SP"
              date={t('dateApr28')}
              amount="R$ 240"
              status={t('p1StatusAwaiting')}
              statusVariant="muted"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage: 'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to right, transparent 65%, rgba(15,13,12,0.35) 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 75%, rgba(15,13,12,0.35) 100%)',
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}

function ExpandableRow({
  label,
  date,
  amount,
  status,
  note,
  expandedPayer,
  expandedMethod,
  expandedReference,
  expandedMatched,
}: {
  label: string
  date: string
  amount: string
  status: string
  note: string
  expandedPayer: string
  expandedMethod: string
  expandedReference: string
  expandedMatched: string
}) {
  return (
    <div className="border-t border-white/[0.04] first:border-t-0">
      <div className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-[13.5px] text-[#f5f5f4]">{label}</p>
            <span className="text-[11.5px] text-[#78716c]">· {date}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#78716c]">{note}</p>
        </div>
        <p className="w-[88px] shrink-0 text-right font-mono text-[13px] text-[#d6d3d1] tabular-nums">
          {amount}
        </p>
        <div className="w-[100px] shrink-0 text-right">
          <StatusPill status={status} variant="paid" spotlight />
        </div>
      </div>
      <div className="mb-3 ml-2 rounded-[10px] border-l-2 border-[#e9408f]/40 bg-white/[0.02] py-2.5 pr-3 pl-4">
        <p className="text-[12px] text-[#f5f5f4]">{expandedPayer}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#a8a29e]">
          <span>{expandedMethod}</span>
          <span className="text-[#78716c]">{expandedReference}</span>
        </div>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-emerald-400/80">
          <span className="size-1 rounded-full bg-emerald-400" />
          {expandedMatched}
        </p>
      </div>
    </div>
  )
}

function Pillar2() {
  const t = useTranslations('landing')
  return (
    <section id="pillar-2" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,_7fr)_minmax(0,_5fr)] lg:items-start">
          <div className="scrollbar-hide order-2 overflow-x-auto overflow-y-clip lg:sticky lg:top-24 lg:order-1 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <Pillar2Mockup />
            </div>
          </div>
          <div className="order-1 px-6 lg:order-2 lg:px-0">
            <FeatureListCopy
              label={t('p2Label')}
              headline={t('p2Headline')}
              intro={t('p2Intro')}
              stages={[
                { title: t('p2StageLeaseTitle'), body: t('p2StageLeaseBody') },
                { title: t('p2StageAdjustTitle'), body: t('p2StageAdjustBody') },
                { title: t('p2StageRenewalTitle'), body: t('p2StageRenewalBody') },
                { title: t('p2StageNoticesTitle'), body: t('p2StageNoticesBody') },
              ]}
              footer={
                <>
                  <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <p className="text-[14.5px] font-medium text-[#f5f5f4]">{t('p2AiLead')}</p>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#a8a29e]">{t('p2AiBody')}</p>
                  </div>
                  <p className="mt-5 text-[13px] leading-[1.6] text-[#78716c]">
                    {t('p2LawyerNote')}
                  </p>
                </>
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureListCopy({
  label,
  headline,
  intro,
  stages,
  footer,
}: {
  label?: string
  headline: string
  intro: string
  stages: Array<{ title: string; body: string }>
  footer?: ReactNode
}) {
  return (
    <div className="relative">
      {label ? <p className="font-mono text-[12px] text-[#78716c] tabular-nums">{label}</p> : null}
      <h2 className="font-display mt-4 text-[34px] leading-[1.05] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
        {headline}
      </h2>
      <p className="mt-6 text-[15.5px] leading-[1.65] text-[#a8a29e]">{intro}</p>
      <ol className="relative mt-10 space-y-7 border-t border-white/[0.12] pt-10 before:absolute before:-top-px before:left-0 before:h-[2px] before:w-12 before:bg-[#e9408f]">
        {stages.map((s, idx) => (
          <li key={s.title} className="relative pl-10">
            <span className="absolute top-0.5 left-0 font-mono text-[11px] text-[#78716c] tabular-nums">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <p className="text-[15px] font-medium text-[#f5f5f4]">{s.title}</p>
            <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[#a8a29e]">{s.body}</p>
          </li>
        ))}
      </ol>
      {footer}
    </div>
  )
}

function Pillar2Mockup() {
  const t = useTranslations('landing')
  return (
    <div className="relative" aria-hidden>
      <div
        className="absolute -inset-x-12 -inset-y-8 rounded-[44px] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(233,64,143,0.14) 0%, rgba(233,64,143,0.04) 50%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="relative h-[600px] overflow-hidden rounded-[32px] border border-white/[0.12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background: 'linear-gradient(195deg, #3a312b 0%, #2b2521 28%, #1d1916 60%, #141110 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 0% 0%, rgba(233,64,143,0.16) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 70% at 100% 100%, rgba(0,0,0,0.5) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="absolute top-20 right-14 left-14 overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/[0.05] px-6 py-4">
            <p className="font-display text-[16px] font-medium tracking-tight text-[#f5f5f4]">
              {t('p2TimelineProperty')}
            </p>
            <p className="mt-1 text-[12px] text-[#78716c]">{t('p2TimelineRange')}</p>
          </div>
          <div className="relative px-6 py-6">
            <div
              className="absolute top-10 bottom-10 left-[34px] w-px bg-white/[0.08]"
              aria-hidden
            />
            <TimelineRow variant="past" title={t('p2TimelineDrafted')} />
            <TimelineRow
              variant="today"
              title={t('p2TimelineTodayLabel')}
              meta={t('p2TimelineTodayRent')}
            />
            <TimelineRow
              variant="future"
              title={t('p2TimelineAdjustment')}
              accent={
                <span className="mt-1.5 inline-flex items-baseline gap-2 font-mono text-[12px] text-[#f5f5f4] tabular-nums">
                  <span>R$ 2.800</span>
                  <span className="text-[#78716c]">→</span>
                  <span>R$ 2.937</span>
                  <span className="text-[10.5px] text-[#a8a29e]">IPCA +4.89%</span>
                </span>
              }
              chip={t('p2TimelineAdjustmentNote')}
            />
            <TimelineRow variant="future" title={t('p2TimelineRenewal')} />
            <TimelineRow variant="end" title={t('p2TimelineEnd')} last />
          </div>
          <div
            className="pointer-events-none absolute inset-0 rounded-[18px] backdrop-blur-md"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 75%, rgba(15,13,12,0.32) 100%)',
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}

function TimelineRow({
  variant,
  title,
  meta,
  accent,
  chip,
  last,
}: {
  variant: 'past' | 'today' | 'future' | 'end'
  title: string
  meta?: string
  accent?: React.ReactNode
  chip?: string
  last?: boolean
}) {
  return (
    <div className={`relative pl-12 ${last ? '' : 'pb-7'}`}>
      <span
        className={
          variant === 'today'
            ? 'absolute top-0.5 left-[26px] inline-flex size-4 items-center justify-center rounded-full bg-[#e9408f]/15 ring-2 ring-[#e9408f]/60'
            : variant === 'end'
              ? 'absolute top-0.5 left-[26px] inline-flex size-4 items-center justify-center rounded-full border-2 border-[#f5f5f4]/60 bg-[#1a1a19] ring-1 ring-white/[0.06] ring-offset-1 ring-offset-[#1a1a19]'
              : variant === 'past'
                ? 'absolute top-0.5 left-[26px] inline-flex size-4 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.10]'
                : 'absolute top-0.5 left-[26px] inline-flex size-4 items-center justify-center rounded-full border border-white/[0.20] bg-[#1a1a19]'
        }
        aria-hidden
      >
        {variant === 'today' ? (
          <span className="size-1.5 rounded-full bg-[#e9408f]" />
        ) : variant === 'past' ? (
          <svg viewBox="0 0 8 8" className="size-[9px]" aria-hidden>
            <path
              d="M1.2 4 L3.3 6 L6.8 1.8"
              fill="none"
              stroke="#a8a29e"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <p
        className={
          variant === 'today'
            ? 'text-[13.5px] font-medium text-[#f5f5f4]'
            : variant === 'past'
              ? 'text-[13.5px] text-[#a8a29e]'
              : 'text-[13.5px] text-[#f5f5f4]'
        }
      >
        {title}
      </p>
      {meta ? <p className="mt-1 text-[12px] text-[#a8a29e]">{meta}</p> : null}
      {accent ? accent : null}
      {chip ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-[#a8a29e]">
          <span className="size-1 rounded-full bg-amber-400" aria-hidden />
          {chip}
        </span>
      ) : null}
    </div>
  )
}

function Pillar3() {
  const t = useTranslations('landing')
  return (
    <section id="pillar-3" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,_7fr)_minmax(0,_5fr)] lg:items-start">
          <div className="scrollbar-hide order-2 overflow-x-auto overflow-y-clip lg:sticky lg:top-24 lg:order-1 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <Pillar3Mockup />
            </div>
          </div>
          <div className="order-1 px-6 lg:order-2 lg:px-0">
            <FeatureListCopy
              label={t('p3Label')}
              headline={t('p3Headline')}
              intro={t('p3Intro')}
              stages={[
                { title: t('p3Stage1Title'), body: t('p3Stage1Body') },
                { title: t('p3Stage2Title'), body: t('p3Stage2Body') },
                { title: t('p3Stage3Title'), body: t('p3Stage3Body') },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function Pillar3Mockup() {
  const t = useTranslations('landing')
  return (
    <div className="relative" aria-hidden>
      <div
        className="absolute -inset-x-12 -inset-y-8 rounded-[44px] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 30% 70%, rgba(233,64,143,0.14) 0%, rgba(233,64,143,0.04) 50%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="relative overflow-hidden rounded-[32px] border border-white/[0.12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background: 'linear-gradient(135deg, #2b2521 0%, #221d19 35%, #181613 70%, #141110 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 55% at 0% 100%, rgba(233,64,143,0.16) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 65% at 100% 0%, rgba(0,0,0,0.45) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="relative space-y-6 px-10 py-14 md:px-14 md:py-16">
          <div className="md:translate-x-[-12px]">
            <ReputationCard
              name={t('p3TenantName')}
              role={t('p3TenantRole')}
              rating="4.87"
              metrics={[
                { primary: '24/24', label: t('p3TMetric1Label') },
                { primary: '17/18', label: t('p3TMetric2Label') },
                { primary: t('p3TMetric3Value'), label: t('p3TMetric3Label') },
                { primary: t('p3TMetric4Value'), label: t('p3TMetric4Label') },
                { primary: '2', label: t('p3TMetric5Label') },
              ]}
              activity={[
                { date: t('dateMay5'), text: t('p3TAct1'), amount: 'R$ 2.800' },
                { date: t('dateApr28'), text: t('p3TAct2'), amount: 'R$ 480' },
                { date: t('dateApr15'), text: t('p3TAct3'), amount: 'R$ 320' },
                { date: t('dateMar5'), text: t('p3TAct4'), amount: '+4.89%' },
              ]}
            />
          </div>
          <div className="md:translate-x-[24px]">
            <ReputationCard
              name={t('p3LandlordName')}
              role={t('p3LandlordRole')}
              rating="4.92"
              metrics={[
                { primary: t('p3LMetric1Value'), label: t('p3LMetric1Label') },
                { primary: t('p3LMetric2Value'), label: t('p3LMetric2Label') },
                { primary: t('p3LMetric3Value'), label: t('p3LMetric3Label') },
                { primary: t('p3LMetric4Value'), label: t('p3LMetric4Label') },
                { primary: '3', label: t('p3LMetric5Label') },
              ]}
              activity={[
                { date: t('dateMay12'), text: t('p3LAct1') },
                { date: t('dateApr22'), text: t('p3LAct2'), amount: '+4.89%' },
                { date: t('dateApr10'), text: t('p3LAct3') },
                { date: t('dateMar15'), text: t('p3LAct4') },
              ]}
            />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0 backdrop-blur-md"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 70%, black 95%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 70%, black 95%, black 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 backdrop-blur-sm"
          style={{
            maskImage: 'linear-gradient(to right, transparent 80%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 80%, black 100%)',
          }}
          aria-hidden
        />
      </div>
    </div>
  )
}

function ReputationCard({
  name,
  role,
  rating,
  metrics,
  activity,
}: {
  name: string
  role: string
  rating: string
  metrics: Array<{ primary: string; label: string }>
  activity: Array<{ date: string; text: string; amount?: string }>
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
        <div className="flex items-baseline gap-2.5">
          <p className="font-display text-[16px] font-medium tracking-tight text-[#f5f5f4]">
            {name}
          </p>
          <p className="text-[11.5px] text-[#78716c]">· {role}</p>
        </div>
        <div className="inline-flex items-baseline gap-1.5">
          <svg viewBox="0 0 12 12" className="size-3 translate-y-[1px] fill-[#e9408f]" aria-hidden>
            <path d="M6 0.5 L7.66 4.32 L11.78 4.7 L8.66 7.44 L9.56 11.5 L6 9.36 L2.44 11.5 L3.34 7.44 L0.22 4.7 L4.34 4.32 Z" />
          </svg>
          <p className="font-mono text-[15px] font-medium text-[#f5f5f4] tabular-nums">{rating}</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-white/[0.05] px-6 py-4">
        {metrics.map((m, idx) => (
          <li key={idx} className="flex items-baseline gap-2 py-1">
            <span className="font-mono text-[12.5px] font-medium text-[#f5f5f4] tabular-nums">
              {m.primary}
            </span>
            <span className="text-[12px] text-[#a8a29e]">{m.label}</span>
          </li>
        ))}
      </ul>
      <ul className="px-6 py-3">
        {activity.map((row, idx) => (
          <li
            key={idx}
            className="flex items-center gap-3 border-t border-white/[0.04] py-2.5 first:border-t-0"
          >
            <span className="w-[52px] shrink-0 font-mono text-[11px] text-[#78716c] tabular-nums">
              {row.date}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#f5f5f4]">{row.text}</span>
            {row.amount ? (
              <span className="shrink-0 font-mono text-[12px] text-[#a8a29e] tabular-nums">
                {row.amount}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Communication() {
  const t = useTranslations('landing')
  return (
    <section id="communication" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,_7fr)_minmax(0,_5fr)] lg:items-start">
          <div className="scrollbar-hide order-2 overflow-x-auto overflow-y-clip lg:sticky lg:top-24 lg:order-1 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <CommunicationMockup />
            </div>
          </div>
          <div className="order-1 px-6 lg:order-2 lg:px-0">
            <FeatureListCopy
              label={t('commLabel')}
              headline={t('commHeadline')}
              intro={t('commIntro')}
              stages={[
                { title: t('commStageMaintTitle'), body: t('commStageMaintBody') },
                { title: t('commStageQuestionsTitle'), body: t('commStageQuestionsBody') },
                { title: t('commStageDisputesTitle'), body: t('commStageDisputesBody') },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function CommunicationMockup() {
  const t = useTranslations('landing')
  return (
    <div className="relative" aria-hidden>
      <div
        className="absolute -inset-x-12 -inset-y-8 rounded-[44px] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(233,64,143,0.14) 0%, rgba(233,64,143,0.04) 50%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="relative overflow-hidden rounded-[32px] border border-white/[0.12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background: 'linear-gradient(195deg, #3a312b 0%, #2b2521 28%, #1d1916 60%, #141110 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 0% 0%, rgba(233,64,143,0.16) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 70% at 100% 100%, rgba(0,0,0,0.5) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="relative px-10 py-12 md:px-14 md:py-14">
          <div className="overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
            <div className="border-b border-white/[0.05] px-5 py-3.5">
              <p className="font-display text-[15px] font-medium tracking-tight text-[#f5f5f4]">
                {t('commThreadTitle')}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#78716c]">{t('commThreadSubtitle')}</p>
            </div>
            <div className="flex">
              <div className="w-[42%] shrink-0 border-r border-white/[0.05] py-1.5">
                <InboxListItem
                  who={t('p3TenantName')}
                  subject={t('commThreadItem1')}
                  type={t('commThreadType1')}
                  time={t('dateMay12')}
                  selected
                />
                <InboxListItem
                  who={t('p3LandlordName')}
                  subject={t('commThreadItem2')}
                  type={t('commThreadType2')}
                  time={t('dateMay5')}
                />
                <InboxListItem
                  who={t('p3TenantName')}
                  subject={t('commThreadItem3')}
                  type={t('commThreadType3')}
                  time={t('dateApr28')}
                />
              </div>
              <div className="min-w-0 flex-1 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-[#a8a29e] uppercase">
                    {t('commThreadType1')}
                  </span>
                  <ThreadStatus status={t('commThreadStatus1')} variant="accent" />
                </div>
                <p className="font-display mt-2.5 text-[17px] leading-tight font-medium text-[#f5f5f4]">
                  {t('commThreadItem1')}
                </p>
                <p className="mt-1 text-[11.5px] text-[#78716c]">
                  {t('p3TenantName')} · {t('dateMay12')}
                </p>
                <p className="mt-3.5 text-[12.5px] leading-[1.55] text-[#d6d3d1]">
                  {t('commInboxBody')}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-[#a8a29e]">
                  <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                    <rect
                      x="1.4"
                      y="3"
                      width="9.2"
                      height="6.6"
                      rx="1.3"
                      fill="none"
                      stroke="#a8a29e"
                      strokeWidth="1"
                    />
                    <circle cx="6" cy="6.3" r="1.7" fill="none" stroke="#a8a29e" strokeWidth="1" />
                  </svg>
                  {t('commThreadTag1')}
                </span>
                <div className="mt-4 rounded-[12px] border-l-2 border-white/[0.12] bg-white/[0.02] py-2.5 pr-3 pl-3.5">
                  <p className="text-[11.5px] font-medium text-[#f5f5f4]">
                    {t('p3LandlordName')}{' '}
                    <span className="font-normal text-[#78716c]">· {t('commInboxReplyMeta')}</span>
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.5] text-[#a8a29e]">
                    {t('commInboxReply')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InboxListItem({
  who,
  subject,
  type,
  time,
  selected,
}: {
  who: string
  subject: string
  type: string
  time: string
  selected?: boolean
}) {
  return (
    <div
      className={
        selected
          ? 'border-l-2 border-white/[0.30] bg-white/[0.05] px-4 py-3'
          : 'border-l-2 border-transparent px-4 py-3'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            selected
              ? 'truncate text-[12px] font-medium text-[#f5f5f4]'
              : 'truncate text-[12px] text-[#d6d3d1]'
          }
        >
          {who}
        </span>
        <span className="shrink-0 text-[10.5px] text-[#78716c]">{time}</span>
      </div>
      <p className="mt-0.5 truncate text-[12px] text-[#a8a29e]">{subject}</p>
      <span className="mt-1 inline-block text-[9.5px] font-medium tracking-[0.10em] text-[#78716c] uppercase">
        {type}
      </span>
    </div>
  )
}

function ThreadStatus({
  status,
  variant,
}: {
  status: string
  variant: 'accent' | 'muted' | 'resolved'
}) {
  if (variant === 'accent') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9408f]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#f0a4c5] ring-1 ring-[#e9408f]/30">
        <span className="size-1.5 rounded-full bg-[#e9408f]" />
        {status}
      </span>
    )
  }
  if (variant === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        {status}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-[#a8a29e]">
      <span className="size-1.5 rounded-full bg-[#78716c]" />
      {status}
    </span>
  )
}

function RevenueMoment() {
  const t = useTranslations('landing')
  return (
    <section id="revenue" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl lg:px-6">
        <div className="grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,_5fr)_minmax(0,_7fr)] lg:items-start">
          <div className="px-6 lg:px-0">
            <FeatureListCopy
              label={t('revLabel')}
              headline={t('revHeadline')}
              intro={t('revIntro')}
              stages={[
                { title: t('revStage1Title'), body: t('revStage1Body') },
                { title: t('revStage2Title'), body: t('revStage2Body') },
                { title: t('revStage3Title'), body: t('revStage3Body') },
                { title: t('revStage4Title'), body: t('revStage4Body') },
                { title: t('revStage5Title'), body: t('revStage5Body') },
                { title: t('revStage6Title'), body: t('revStage6Body') },
              ]}
            />
          </div>
          <div className="scrollbar-hide overflow-x-auto overflow-y-clip lg:sticky lg:top-24 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <ReportingMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ReportingMockup() {
  const t = useTranslations('landing')
  const costs = [
    { label: 'Condomínio', amount: 'R$ 480' },
    { label: 'IPTU', amount: 'R$ 240' },
    { label: t('revMockMaintenance'), amount: 'R$ 180' },
    { label: t('revMockMortgage'), amount: 'R$ 1.100' },
  ]
  return (
    <div className="relative" aria-hidden>
      <div
        className="absolute -inset-x-12 -inset-y-8 rounded-[44px] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(233,64,143,0.14) 0%, rgba(233,64,143,0.04) 50%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="relative h-[440px] overflow-hidden rounded-[32px] border border-white/[0.12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background: 'linear-gradient(165deg, #3a312b 0%, #2b2521 28%, #1d1916 60%, #141110 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 100% 0%, rgba(233,64,143,0.16) 0%, transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="absolute top-14 right-12 left-12 overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
          <div className="flex items-baseline justify-between border-b border-white/[0.05] px-6 py-4">
            <p className="font-display text-[16px] font-medium tracking-tight text-[#f5f5f4]">
              Apt 23B · Vila Mariana
            </p>
            <p className="text-[12px] text-[#78716c]">{t('revMockPeriod')}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-b border-white/[0.05]">
            <div className="px-5 py-4">
              <p className="font-mono text-[17px] font-medium text-[#f5f5f4] tabular-nums">
                R$ 33.600
              </p>
              <p className="mt-1 text-[10.5px] tracking-[0.10em] text-[#78716c] uppercase">
                {t('revMockRevenueLabel')}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="font-mono text-[17px] font-medium text-[#f5f5f4] tabular-nums">
                R$ 9.600
              </p>
              <p className="mt-1 text-[10.5px] tracking-[0.10em] text-[#78716c] uppercase">
                {t('revMockReturnLabel')}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="font-mono text-[17px] font-medium text-[#f5f5f4] tabular-nums">
                R$ 180.000
              </p>
              <p className="mt-1 text-[10.5px] tracking-[0.10em] text-[#78716c] uppercase">
                {t('revMockEquityLabel')}
              </p>
            </div>
          </div>
          <div className="border-b border-white/[0.05] px-6 py-4">
            <p className="text-[10.5px] tracking-[0.12em] text-[#78716c] uppercase">
              {t('revMockCostsLabel')}
            </p>
            <div className="mt-3 space-y-2">
              {costs.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#a8a29e]">{c.label}</span>
                  <span className="font-mono text-[#d6d3d1] tabular-nums">{c.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[10.5px] tracking-[0.12em] text-[#78716c] uppercase">
                {t('revMockCompareLabel')}
              </p>
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-[12px] text-[#f5f5f4] tabular-nums">R$ 2.800</span>
                <span className="rounded-full bg-[#e9408f]/15 px-1.5 py-0.5 text-[9.5px] font-medium tracking-[0.06em] text-[#f0a4c5] uppercase">
                  {t('revMockUnderMarket')}
                </span>
              </span>
            </div>
            <div className="relative mt-3 h-1.5 rounded-full bg-white/[0.06]">
              <div
                className="absolute inset-y-0 rounded-full bg-[#e9408f]/25"
                style={{ left: '20%', right: '20%' }}
              />
              <div
                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e9408f] ring-2 ring-[#1a1a19]"
                style={{ left: '25%' }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10.5px] text-[#78716c] tabular-nums">
              <span>R$ 2.600</span>
              <span>R$ 3.400</span>
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-0 rounded-[18px] backdrop-blur-md"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 80%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 80%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 72%, rgba(15,13,12,0.4) 100%)',
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}

function Comparison() {
  const t = useTranslations('landing')
  const rows = Array.from({ length: 8 }, (_, i) => i + 1)
    .filter((n) => t.has(`compRow${n}Label`))
    .map((n) => ({
      label: t(`compRow${n}Label`),
      pm: t(`compRow${n}PM`),
      mabenn: t(`compRow${n}Mabenn`),
    }))
  return (
    <section id="comparison" className="relative px-6 py-32 md:py-40">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp delay={0.05}>
            <h2 className="font-display text-[36px] leading-[1.05] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[48px]">
              {t('compHeadline')}
            </h2>
          </FadeUp>
          <FadeUp delay={0.18}>
            <p className="mt-7 text-[16px] leading-[1.65] text-[#a8a29e]">{t('compBody')}</p>
          </FadeUp>
        </div>

        <FadeUp delay={0.28}>
          <ComparisonTable colPM={t('compColPM')} colMabenn={t('compColMabenn')} rows={rows} />
        </FadeUp>

        <FadeUp delay={0.4}>
          <p className="font-display mx-auto mt-16 max-w-3xl text-center text-[22px] leading-[1.45] font-medium tracking-[-0.005em] text-[#f5f5f4] md:text-[26px]">
            {t('compCloserPart1')}{' '}
            <span className="whitespace-nowrap text-[#e9408f]">{t('compCloserFigure')}</span>{' '}
            {t('compCloserPart2')}
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

function ComparisonTable({
  colPM,
  colMabenn,
  rows,
}: {
  colPM: string
  colMabenn: string
  rows: Array<{ label: string; pm: string; mabenn: string }>
}) {
  return (
    <div className="mt-14">
      <div className="hidden lg:block">
        <div className="grid grid-cols-[minmax(0,_3fr)_minmax(0,_5fr)_minmax(0,_5fr)] border-b border-white/[0.10] pb-4">
          <span />
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#78716c] uppercase">
            {colPM}
          </p>
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#f5f5f4] uppercase">
            {colMabenn}
          </p>
        </div>
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className={
              idx === rows.length - 1
                ? 'grid grid-cols-[minmax(0,_3fr)_minmax(0,_5fr)_minmax(0,_5fr)] gap-x-6 py-6'
                : 'grid grid-cols-[minmax(0,_3fr)_minmax(0,_5fr)_minmax(0,_5fr)] gap-x-6 border-b border-white/[0.05] py-6'
            }
          >
            <p className="text-[12.5px] tracking-[0.10em] text-[#78716c] uppercase">{row.label}</p>
            <p className="text-[15px] leading-[1.5] text-[#a8a29e]">{row.pm}</p>
            <p className="text-[15px] leading-[1.5] text-[#f5f5f4]">{row.mabenn}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4 lg:hidden">
        {rows.map((row) => (
          <div
            key={row.label}
            className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#1a1a19]"
          >
            <p className="border-b border-white/[0.05] px-5 py-3 text-[11.5px] tracking-[0.12em] text-[#a8a29e] uppercase">
              {row.label}
            </p>
            <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
              <div className="px-5 py-4">
                <p className="text-[10.5px] tracking-[0.12em] text-[#78716c] uppercase">{colPM}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#a8a29e]">{row.pm}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10.5px] tracking-[0.12em] text-[#f5f5f4]/80 uppercase">
                  {colMabenn}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#f5f5f4]">{row.mabenn}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Pricing() {
  const t = useTranslations('landing')
  return (
    <section className="relative px-6 py-32 md:py-40">
      <div id="pricing" className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <FadeUp delay={0.05}>
            <h2 className="font-display text-[36px] leading-[1.05] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[48px]">
              {t('pricingHeadline')}
            </h2>
          </FadeUp>
          <FadeUp delay={0.18}>
            <p className="mt-7 text-[16px] leading-[1.65] text-[#a8a29e]">{t('pricingBody')}</p>
          </FadeUp>
        </div>
        <FadeUp delay={0.28}>
          <PricingCard />
        </FadeUp>
      </div>
    </section>
  )
}

function PricingCard() {
  const t = useTranslations('landing')
  const [annual, setAnnual] = useState(false)
  return (
    <div className="mx-auto mt-14 max-w-md">
      <div className="overflow-hidden rounded-[24px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
        <div className="px-7 pt-7 pb-6">
          <div className="relative mx-auto flex w-fit rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            <span
              className={`pointer-events-none absolute inset-y-1 left-1 w-[96px] rounded-full bg-[#f5f0e8] transition-transform duration-300 ease-out ${
                annual ? 'translate-x-full' : 'translate-x-0'
              }`}
              aria-hidden
            />
            <button
              type="button"
              aria-pressed={!annual}
              onClick={() => setAnnual(false)}
              className={`relative z-10 w-[96px] rounded-full py-1.5 text-[12.5px] font-medium transition-colors ${
                !annual ? 'text-[#1c1917]' : 'text-[#a8a29e] hover:text-[#f5f5f4]'
              }`}
            >
              {t('pricingToggleMonthly')}
            </button>
            <button
              type="button"
              aria-pressed={annual}
              onClick={() => setAnnual(true)}
              className={`relative z-10 w-[96px] rounded-full py-1.5 text-[12.5px] font-medium transition-colors ${
                annual ? 'text-[#1c1917]' : 'text-[#a8a29e] hover:text-[#f5f5f4]'
              }`}
            >
              {t('pricingToggleAnnual')}
            </button>
          </div>

          <div className="mt-7 text-center">
            <div className="flex items-baseline justify-center gap-1.5">
              <span
                key={annual ? 'price-annual' : 'price-monthly'}
                className="font-display animate-[fade-in_280ms_ease-out_both] text-[52px] leading-none font-medium tracking-[-0.02em] text-[#f5f5f4]"
              >
                {annual ? 'R$ 490' : 'R$ 49'}
              </span>
              <span
                key={annual ? 'unit-annual' : 'unit-monthly'}
                className="animate-[fade-in_280ms_ease-out_both] font-mono text-[15px] text-[#a8a29e]"
              >
                {annual ? t('pricingPerYear') : t('pricingPerMonth')}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-[#78716c]">{t('pricingPerRental')}</p>
            <div className="mt-3 flex h-[22px] items-center justify-center">
              <span
                className={`inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.03] px-2.5 py-0.5 text-[11.5px] text-[#a8a29e] transition-opacity duration-300 ${
                  annual ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {t('pricingAnnualSave')}
              </span>
            </div>
          </div>

          <ul className="mt-7 space-y-3">
            {[t('pricingBullet1'), t('pricingBullet2'), t('pricingBullet3')].map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span
                  className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-white/[0.06]"
                  aria-hidden
                >
                  <svg viewBox="0 0 10 10" className="size-[10px]">
                    <path
                      d="M2 5 L4.2 7 L8 2.6"
                      fill="none"
                      stroke="#a8a29e"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p className="text-[14px] leading-[1.5] text-[#a8a29e]">{bullet}</p>
              </li>
            ))}
          </ul>

          <div className="mt-7 rounded-2xl border border-[#e9408f]/30 bg-[#e9408f]/[0.10] px-5 py-4">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium tracking-[0.12em] text-[#f0a4c5] uppercase">
              <svg viewBox="0 0 12 12" className="size-2.5 fill-[#e9408f]" aria-hidden>
                <path d="M6 0.5 L7.4 4.1 L11.3 4.4 L8.3 6.9 L9.2 10.8 L6 8.7 L2.8 10.8 L3.7 6.9 L0.7 4.4 L4.6 4.1 Z" />
              </svg>
              {t('pricingFoundingBadge')}
            </span>
            <p className="font-display mt-2 text-[20px] leading-[1.2] font-medium text-[#f5f5f4]">
              {t('pricingFoundingHook')}
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-[#a8a29e]">
              {t('pricingFoundingDetail')}
            </p>
          </div>

          <WaitlistCta variant="pricing" />
        </div>
      </div>
    </div>
  )
}

function TwoSides() {
  const t = useTranslations('landing')
  const llBullets = [t('llBullet1'), t('llBullet2'), t('llBullet3'), t('llBullet4'), t('llBullet5')]
  const tenantBullets = [
    t('tenantBullet1'),
    t('tenantBullet2'),
    t('tenantBullet3'),
    t('tenantBullet4'),
    t('tenantBullet5'),
  ]
  return (
    <section id="two-sides" className="relative px-6 py-32 md:py-40">
      <div className="mx-auto max-w-5xl">
        <FadeUp delay={0.05}>
          <h2 className="font-display mx-auto max-w-3xl text-center text-[34px] leading-[1.05] font-medium tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
            {t('twoSidesTitle')}
          </h2>
        </FadeUp>
        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-white/[0.06]">
          <TwoSidesColumn header={t('twoSidesLLHeader')} bullets={llBullets} side="left" />
          <TwoSidesColumn header={t('twoSidesTenantHeader')} bullets={tenantBullets} side="right" />
        </div>
      </div>
    </section>
  )
}

function TwoSidesColumn({
  header,
  bullets,
  side,
}: {
  header: string
  bullets: string[]
  side: 'left' | 'right'
}) {
  return (
    <div className={side === 'left' ? 'lg:pr-14' : 'lg:pl-14'}>
      <p className="text-[12px] font-medium tracking-[0.14em] text-[#78716c] uppercase">{header}</p>
      <ul className="mt-7 space-y-5">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3.5">
            <span
              className="mt-1.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#e9408f]/15"
              aria-hidden
            >
              <svg viewBox="0 0 10 10" className="size-[10px]">
                <path
                  d="M2 5 L4.2 7 L8 2.6"
                  fill="none"
                  stroke="#e9408f"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-[15.5px] leading-[1.6] text-[#a8a29e]">{bullet}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
