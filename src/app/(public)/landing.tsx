'use client'

// MARKETING ONLY — do not import into /app/*. Embedded product "mockups" here are
// illustrative marketing UI, deliberately separate from the real product components.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FadeUp } from '@/components/fade-up'
import { LanguageSwitcher } from '@/components/language-switcher'
import { WaitlistForm } from './waitlist-form'
import { useWaitlist, WaitlistProvider } from './waitlist-context'

export function Landing({
  privacyHref,
}: {
  privacyHref: string
}) {
  const t = useTranslations('landing')

  return (
    <WaitlistProvider>
      <div className="dark bg-[#141413] text-[#f5f5f4] font-editorial selection:bg-[#e9408f]/30 selection:text-[#f5f5f4]">
        <StickyNav />
        <div className="relative">
          <div className="mx-auto max-w-3xl">
            <Nav signInLabel={t('signIn')} />
            <Hero
              line1={t('heroTitleLine1')}
              line2={t('heroTitleLine2')}
              line3={t('heroTitleLine3')}
              subtitle={t('heroSubtitle')}
              ctaSecondary={t('heroCtaSecondary')}
              foundingLine={t('heroFoundingLine')}
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
          <Pillar1 />
          <Pillar2 />
          <Pillar3 />
          <Communication />
          <RevenueMoment />
          <Comparison />
          <Pricing />
          <TwoSides />
          <TrustBand />
          <Faq privacyHref={privacyHref} />
          <div className="mx-auto max-w-3xl">
            <FinalCta
              title={t('ctaTitle')}
              subtitle={t('ctaSubtitle')}
            />
            <Footer
              copyright={t('footerCopyright')}
              privacy={t('footerPrivacy')}
              privacyHref={privacyHref}
            />
          </div>
        </div>
      </div>
    </WaitlistProvider>
  )
}

function StickyNav() {
  const t = useTranslations('landing')
  const [active, setActive] = useState('')
  const [pinned, setPinned] = useState(false)
  const links = [
    { id: 'pillar-1', label: t('navHowItWorks') },
    { id: 'pricing', label: t('navPricing') },
    { id: 'faq', label: t('navFaq') },
  ]
  useEffect(() => {
    // Active = the last nav section whose top has passed the viewport midline. Computed from live
    // positions so it's correct *on load* too — an IntersectionObserver only fires on crossings, so
    // reloading mid-section would never highlight. The read is rAF-throttled and only touches three
    // elements, so it stays cheap. "How it works" owns everything from its section until Pricing.
    const navSections = ['pillar-1', 'pricing', 'faq']
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
        className={`flex w-full max-w-md items-center justify-between gap-1 rounded-full border border-white/[0.10] bg-[#1a1a19]/80 px-1.5 py-1.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md sm:w-auto sm:justify-center sm:pointer-events-auto ${
          pinned ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-0.5">
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
              {l.label}
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
        <span className="sm:hidden">{t('navJoinShort')}</span>
        <span className="hidden sm:inline">{t('heroCtaPrimary')}</span>
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
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
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
    </a>
  )
}

function Nav({ signInLabel }: { signInLabel: string }) {
  return (
    <nav id="site-nav" className="relative z-20 flex items-center justify-between px-6 py-6">
      <span className="font-display text-[22px] font-semibold tracking-tight text-[#f5f5f4]">
        mabenn
      </span>
      <Link
        href="/auth/sign-in"
        className="rounded-full border border-white/[0.12] px-4 py-2 text-sm font-medium text-[#f5f5f4] transition-colors hover:border-white/[0.2] hover:bg-white/[0.06]"
      >
        {signInLabel}
      </Link>
    </nav>
  )
}

type HeroProps = {
  line1: string
  line2: string
  line3: string
  subtitle: string
  ctaSecondary: string
  foundingLine: string
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
        <FadeUp delay={0.12}>
          <h1 className="font-display text-[44px] font-medium leading-[1.02] tracking-[-0.02em] text-[#f5f5f4] md:text-[64px]">
            <span className="block">{props.line1}</span>
            <span className="block">{props.line2}</span>
            <span className="block">{props.line3}</span>
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
              href="#pillar-1"
              className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-[#f5f5f4] transition-opacity hover:opacity-80"
            >
              {props.ctaSecondary}
              <span aria-hidden className="text-[#a8a29e] transition-transform group-hover:translate-x-0.5">↗</span>
            </a>
          </div>
        </FadeUp>
        <FadeUp delay={0.5}>
          <p className="mt-5 text-[14px] font-medium leading-[1.5] text-[#f5f5f4]">
            {props.foundingLine}
          </p>
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
    <div className="pointer-events-none absolute -inset-20 -left-60 -right-60" aria-hidden>
      <div
        className="absolute h-[200px] w-[450px] rounded-full blur-[60px]"
        style={{
          left: 'calc(15% + 24px)',
          top: '15%',
          background:
            'radial-gradient(ellipse, rgba(233,64,143,0.42) 0%, transparent 70%)',
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
          background:
            'linear-gradient(150deg, #3a312b 0%, #2b2521 25%, #1d1916 60%, #141110 100%)',
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
        <div className="absolute top-10 left-8 right-[-40px] overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
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
            <PeekRow label="Água · Sabesp" date={t('dateApr20')} amount="R$ 95" status={props.statusAwaiting} statusVariant="muted" />
            <PeekRow label="Internet · Vivo" date={t('dateApr25')} amount="R$ 165" status={props.statusAwaiting} statusVariant="muted" />
            <PeekRow label="IPTU · Prefeitura SP" date={t('dateApr28')} amount="R$ 240" status={props.statusAwaiting} statusVariant="muted" />
          </div>
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
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
              background:
                'linear-gradient(to bottom, transparent 80%, rgba(15,13,12,0.30) 100%)',
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
      <p className="text-[10.5px] uppercase tracking-[0.12em] text-[#78716c]">{label}</p>
      <p
        className={
          emphasis
            ? 'mt-1 font-mono text-[16px] tabular-nums font-medium text-[#f5f5f4]'
            : 'mt-1 font-mono text-[16px] tabular-nums text-[#a8a29e]'
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
        {note ? (
          <p className="mt-0.5 text-[11px] text-[#78716c]">{note}</p>
        ) : null}
      </div>
      <p className="w-[88px] shrink-0 text-right font-mono text-[13px] tabular-nums text-[#d6d3d1]">
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


function Faq({ privacyHref }: { privacyHref: string }) {
  const t = useTranslations('landing')
  const { setRole, submitted } = useWaitlist()
  const items: Array<{ q: string; a: string; linkHref?: string; linkLabel?: string }> = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ6'), a: t('faqA6') },
    { q: t('faqQ3'), a: t('faqA3'), linkHref: privacyHref, linkLabel: t('faqA3Link') },
    // Drop the tenant waitlist CTA once they've joined — one email = one role.
    { q: t('faqQ7'), a: t('faqA7'), ...(submitted ? {} : { linkHref: '#waitlist', linkLabel: t('ctaTenantCta') }) },
    { q: t('faqQ8'), a: t('faqA8') },
    { q: t('faqQ9'), a: t('faqA9') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
  ]
  return (
    <section className="relative px-6 py-32 md:py-40">
      <div id="faq" className="mx-auto max-w-4xl">
        <FadeUp delay={0.05}>
          <h2 className="text-center font-display text-[36px] font-medium leading-[1.05] tracking-[-0.015em] text-[#f5f5f4] md:text-[48px]">
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
      <p className="text-[15.5px] font-medium leading-[1.4] text-[#f5f5f4]">{q}</p>
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
    <section id="trust" className="relative border-y border-white/[0.06] bg-white/[0.015] px-6 py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <FadeUp delay={0.05}>
          <p className="text-center text-[11.5px] font-medium uppercase tracking-[0.18em] text-[#a8a29e]">
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
                  <circle cx="8" cy="6.2" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
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
                  <circle cx="8" cy="8" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              }
            />
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

function TrustChip({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode
  label: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center text-center md:items-start md:text-left">
      <span
        className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[#a8a29e]"
        aria-hidden
      >
        {icon}
      </span>
      <p className="mt-4 text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#78716c]">
        {label}
      </p>
      <p className="mt-2 text-[15px] leading-[1.55] text-[#a8a29e]">{body}</p>
    </div>
  )
}

function FinalCta({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <section id="waitlist" className="relative px-6 py-24 md:py-32">
      <FinalCtaGlow />
      <div className="relative z-10 text-center">
        <FadeUp delay={0.05}>
          <h2 className="mx-auto max-w-[18ch] font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-[#f5f5f4] md:text-[52px]">
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
        className="absolute left-1/2 top-1/3 h-[440px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-[100px]"
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
              mech={[
                { title: t('p1Mech1Title'), body: t('p1Mech1Body') },
                { title: t('p1Mech2Title'), body: t('p1Mech2Body') },
                { title: t('p1Mech3Title'), body: t('p1Mech3Body') },
              ]}
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
  mech,
}: {
  label: string
  headline: string
  body1: string
  body2: string
  closer: string
  mech: Array<{ title: string; body: string }>
}) {
  return (
    <div className="relative">
      <p className="font-mono text-[12px] tabular-nums text-[#78716c]">{label}</p>
      <h2 className="mt-4 font-display text-[34px] font-medium leading-[1.05] tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
        {headline}
      </h2>
      <div className="mt-7 space-y-6 text-[15.5px] leading-[1.65] text-[#a8a29e]">
        <p>{body1}</p>
        <p>{body2}</p>
        <p className="font-medium text-[#f5f5f4]">{closer}</p>
      </div>
      <ul className="relative mt-20 space-y-14 border-t border-white/[0.12] pt-14 before:absolute before:-top-px before:left-0 before:h-[2px] before:w-12 before:bg-[#e9408f]">
        {mech.map((m, idx) => (
          <li key={m.title} className="relative pl-10">
            <span className="absolute left-0 top-1 font-mono text-[10.5px] tabular-nums text-[#78716c]">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <p className="text-[13.5px] font-medium uppercase tracking-[0.10em] text-[#f5f5f4]">
              {m.title}
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-[#a8a29e]">{m.body}</p>
          </li>
        ))}
      </ul>
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
          background:
            'linear-gradient(165deg, #3a312b 0%, #2b2521 28%, #1d1916 60%, #141110 100%)',
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
        <div className="absolute top-20 left-16 right-[-80px] overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
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
              maskImage:
                'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 35%, black 85%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, transparent 65%, rgba(15,13,12,0.35) 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, transparent 75%, rgba(15,13,12,0.35) 100%)',
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
        <p className="w-[88px] shrink-0 text-right font-mono text-[13px] tabular-nums text-[#d6d3d1]">
          {amount}
        </p>
        <div className="w-[100px] shrink-0 text-right">
          <StatusPill status={status} variant="paid" spotlight />
        </div>
      </div>
      <div className="mb-3 ml-2 rounded-[10px] border-l-2 border-[#e9408f]/40 bg-white/[0.02] py-2.5 pl-4 pr-3">
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
          <div className="scrollbar-hide order-2 overflow-x-auto overflow-y-clip lg:order-1 lg:sticky lg:top-24 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <Pillar2Mockup />
            </div>
          </div>
          <div className="order-1 px-6 lg:order-2 lg:px-0">
            <Pillar2Copy
              label={t('p2Label')}
              headline={t('p2Headline')}
              body1={t('p2Body1')}
              body2={t('p2Body2')}
              body3={t('p2Body3')}
              aiLead={t('p2AiLead')}
              aiBody={t('p2AiBody')}
              anchor={t('p2Anchor')}
              closer={t('p2Closer')}
              mech={[
                { title: t('p2Mech1Title'), body: t('p2Mech1Body') },
                { title: t('p2Mech2Title'), body: t('p2Mech2Body') },
                { title: t('p2Mech3Title'), body: t('p2Mech3Body') },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function Pillar2Copy({
  label,
  headline,
  body1,
  body2,
  body3,
  aiLead,
  aiBody,
  anchor,
  closer,
  mech,
}: {
  label: string
  headline: string
  body1: string
  body2: string
  body3: string
  aiLead: string
  aiBody: string
  anchor: string
  closer: string
  mech: Array<{ title: string; body: string }>
}) {
  return (
    <div className="relative">
      <p className="font-mono text-[12px] tabular-nums text-[#78716c]">{label}</p>
      <h2 className="mt-4 font-display text-[34px] font-medium leading-[1.05] tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
        {headline}
      </h2>
      <div className="mt-7 space-y-6 text-[15.5px] leading-[1.65] text-[#a8a29e]">
        <p>{body1}</p>
        <p>{body2}</p>
        <p>{body3}</p>
        <p>
          <span className="font-medium text-[#f5f5f4]">{aiLead}</span>{' '}
          <span>{aiBody}</span>
        </p>
        <p>{anchor}</p>
        <p className="font-medium text-[#f5f5f4]">{closer}</p>
      </div>
      <ul className="relative mt-20 space-y-14 border-t border-white/[0.12] pt-14 before:absolute before:-top-px before:left-0 before:h-[2px] before:w-12 before:bg-[#e9408f]">
        {mech.map((m, idx) => (
          <li key={m.title} className="relative pl-10">
            <span className="absolute left-0 top-1 font-mono text-[10.5px] tabular-nums text-[#78716c]">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <p className="text-[13.5px] font-medium uppercase tracking-[0.10em] text-[#f5f5f4]">
              {m.title}
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-[#a8a29e]">{m.body}</p>
          </li>
        ))}
      </ul>
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
          background:
            'linear-gradient(195deg, #3a312b 0%, #2b2521 28%, #1d1916 60%, #141110 100%)',
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
        <div className="absolute top-20 left-14 right-14 overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/[0.05] px-6 py-4">
            <p className="font-display text-[16px] font-medium tracking-tight text-[#f5f5f4]">
              {t('p2TimelineProperty')}
            </p>
            <p className="mt-1 text-[12px] text-[#78716c]">{t('p2TimelineRange')}</p>
          </div>
          <div className="relative px-6 py-6">
            <div className="absolute left-[34px] top-10 bottom-10 w-px bg-white/[0.08]" aria-hidden />
            <TimelineRow
              variant="past"
              title={t('p2TimelineDrafted')}
            />
            <TimelineRow
              variant="today"
              title={t('p2TimelineTodayLabel')}
              meta={t('p2TimelineTodayRent')}
            />
            <TimelineRow
              variant="future"
              title={t('p2TimelineAdjustment')}
              accent={
                <span className="mt-1.5 inline-flex items-baseline gap-2 font-mono text-[12px] tabular-nums text-[#f5f5f4]">
                  <span>R$ 2.800</span>
                  <span className="text-[#78716c]">→</span>
                  <span>R$ 2.937</span>
                  <span className="text-[10.5px] text-[#a8a29e]">IPCA +4.89%</span>
                </span>
              }
              chip={t('p2TimelineAdjustmentNote')}
            />
            <TimelineRow
              variant="future"
              title={t('p2TimelineRenewal')}
            />
            <TimelineRow
              variant="end"
              title={t('p2TimelineEnd')}
              last
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 55%, black 90%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, transparent 75%, rgba(15,13,12,0.32) 100%)',
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
            ? 'absolute left-[26px] top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-[#e9408f]/15 ring-2 ring-[#e9408f]/60'
            : variant === 'end'
              ? 'absolute left-[26px] top-0.5 inline-flex size-4 items-center justify-center rounded-full border-2 border-[#f5f5f4]/60 bg-[#1a1a19] ring-1 ring-white/[0.06] ring-offset-1 ring-offset-[#1a1a19]'
              : variant === 'past'
                ? 'absolute left-[26px] top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.10]'
                : 'absolute left-[26px] top-0.5 inline-flex size-4 items-center justify-center rounded-full border border-white/[0.20] bg-[#1a1a19]'
        }
        aria-hidden
      >
        {variant === 'today' ? (
          <span className="size-1.5 rounded-full bg-[#e9408f]" />
        ) : variant === 'past' ? (
          <svg viewBox="0 0 8 8" className="size-[9px]" aria-hidden>
            <path d="M1.2 4 L3.3 6 L6.8 1.8" fill="none" stroke="#a8a29e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,_5fr)_minmax(0,_7fr)] lg:items-start">
          <div className="px-6 lg:px-0">
            <Pillar3Copy
              label={t('p3Label')}
              headline={t('p3Headline')}
              body1={t('p3Body1')}
              body2={t('p3Body2')}
              body3={t('p3Body3')}
              closer={t('p3Closer')}
              mech={[
                { title: t('p3Mech1Title'), body: t('p3Mech1Body') },
                { title: t('p3Mech2Title'), body: t('p3Mech2Body') },
                { title: t('p3Mech3Title'), body: t('p3Mech3Body') },
              ]}
            />
          </div>
          <div className="scrollbar-hide overflow-x-auto overflow-y-clip lg:sticky lg:top-24 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <Pillar3Mockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pillar3Copy({
  label,
  headline,
  body1,
  body2,
  body3,
  closer,
  mech,
}: {
  label: string
  headline: string
  body1: string
  body2: string
  body3: string
  closer: string
  mech: Array<{ title: string; body: string }>
}) {
  return (
    <div className="relative">
      <p className="font-mono text-[12px] tabular-nums text-[#78716c]">{label}</p>
      <h2 className="mt-4 font-display text-[34px] font-medium leading-[1.05] tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
        {headline}
      </h2>
      <div className="mt-7 space-y-6 text-[15.5px] leading-[1.65] text-[#a8a29e]">
        <p>{body1}</p>
        <p>{body2}</p>
        <p className="font-medium text-[#f5f5f4]">{body3}</p>
        <p className="font-medium text-[#f5f5f4]">{closer}</p>
      </div>
      <ul className="relative mt-20 space-y-14 border-t border-white/[0.12] pt-14 before:absolute before:-top-px before:left-0 before:h-[2px] before:w-12 before:bg-[#e9408f]">
        {mech.map((m, idx) => (
          <li key={m.title} className="relative pl-10">
            <span className="absolute left-0 top-1 font-mono text-[10.5px] tabular-nums text-[#78716c]">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <p className="text-[13.5px] font-medium uppercase tracking-[0.10em] text-[#f5f5f4]">
              {m.title}
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-[#a8a29e]">{m.body}</p>
          </li>
        ))}
      </ul>
    </div>
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
          background:
            'linear-gradient(135deg, #2b2521 0%, #221d19 35%, #181613 70%, #141110 100%)',
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
            maskImage:
              'linear-gradient(to bottom, transparent 70%, black 95%, black 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 70%, black 95%, black 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 backdrop-blur-sm"
          style={{
            maskImage:
              'linear-gradient(to right, transparent 80%, black 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 80%, black 100%)',
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
          <p className="font-mono text-[15px] tabular-nums font-medium text-[#f5f5f4]">
            {rating}
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-white/[0.05] px-6 py-4">
        {metrics.map((m, idx) => (
          <li key={idx} className="flex items-baseline gap-2 py-1">
            <span className="font-mono text-[12.5px] tabular-nums font-medium text-[#f5f5f4]">
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
            <span className="w-[52px] shrink-0 font-mono text-[11px] tabular-nums text-[#78716c]">
              {row.date}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#f5f5f4]">
              {row.text}
            </span>
            {row.amount ? (
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-[#a8a29e]">
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
          <div className="scrollbar-hide order-2 overflow-x-auto overflow-y-clip lg:order-1 lg:sticky lg:top-24 lg:overflow-visible">
            <div className="w-[760px] pl-6 lg:w-auto lg:pl-0">
              <CommunicationMockup />
            </div>
          </div>
          <div className="order-1 px-6 lg:order-2 lg:px-0">
            <Pillar1Copy
              label={t('commLabel')}
              headline={t('commHeadline')}
              body1={t('commBody1')}
              body2={t('commBody2')}
              closer={t('commCloser')}
              mech={[
                { title: t('commMech1Title'), body: t('commMech1Body') },
                { title: t('commMech2Title'), body: t('commMech2Body') },
                { title: t('commMech3Title'), body: t('commMech3Body') },
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
          background:
            'linear-gradient(195deg, #3a312b 0%, #2b2521 28%, #1d1916 60%, #141110 100%)',
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
                  <span className="inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#a8a29e]">
                    {t('commThreadType1')}
                  </span>
                  <ThreadStatus status={t('commThreadStatus1')} variant="accent" />
                </div>
                <p className="mt-2.5 font-display text-[17px] font-medium leading-tight text-[#f5f5f4]">
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
                    <rect x="1.4" y="3" width="9.2" height="6.6" rx="1.3" fill="none" stroke="#a8a29e" strokeWidth="1" />
                    <circle cx="6" cy="6.3" r="1.7" fill="none" stroke="#a8a29e" strokeWidth="1" />
                  </svg>
                  {t('commThreadTag1')}
                </span>
                <div className="mt-4 rounded-[12px] border-l-2 border-white/[0.12] bg-white/[0.02] py-2.5 pl-3.5 pr-3">
                  <p className="text-[11.5px] font-medium text-[#f5f5f4]">
                    {t('p3LandlordName')}{' '}
                    <span className="font-normal text-[#78716c]">· {t('commInboxReplyMeta')}</span>
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.5] text-[#a8a29e]">{t('commInboxReply')}</p>
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
      <span className="mt-1 inline-block text-[9.5px] font-medium uppercase tracking-[0.10em] text-[#78716c]">
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
    <section id="revenue" className="relative px-6 py-32 md:py-40">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <FadeUp delay={0.05}>
            <h2 className="font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-[#f5f5f4] md:text-[52px]">
              {t('revHeadline')}
            </h2>
          </FadeUp>
          <FadeUp delay={0.18}>
            <p className="mt-6 text-[16px] leading-[1.65] text-[#a8a29e]">
              {t.rich('revBody1', {
                em: (chunks) => <span className="font-medium text-[#f5f5f4]">{chunks}</span>,
              })}
            </p>
          </FadeUp>
          <FadeUp delay={0.26}>
            <p className="mt-4 text-[16px] leading-[1.65] text-[#a8a29e]">{t('revBody2')}</p>
          </FadeUp>
          <FadeUp delay={0.34}>
            <p className="mt-4 text-[15px] leading-[1.6] text-[#78716c]">{t('revBody3')}</p>
          </FadeUp>
        </div>
        <FadeUp delay={0.44}>
          <div className="scrollbar-hide -mr-6 overflow-x-auto overflow-y-clip lg:mr-0 lg:overflow-visible">
            <div className="w-[760px] pr-6 lg:w-auto lg:pr-0">
              <RevenueChartMockup
                title={t('revChartTitle')}
                headline={t('revChartHeadline')}
                delta={t('revChartDelta')}
                footer={t('revChartFooter')}
              />
            </div>
          </div>
        </FadeUp>
        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-12">
          {[
            { title: t('revChip1Title'), body: t('revChip1Body') },
            { title: t('revChip2Title'), body: t('revChip2Body') },
            { title: t('revChip3Title'), body: t('revChip3Body') },
          ].map((chip, idx) => (
            <div key={chip.title} className="relative pl-10">
              <span className="absolute left-0 top-1 font-mono text-[10.5px] tabular-nums text-[#78716c]">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <p className="text-[13.5px] font-medium uppercase tracking-[0.10em] text-[#f5f5f4]">
                {chip.title}
              </p>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-[#a8a29e]">{chip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RevenueChartMockup({
  title,
  headline,
  delta,
  footer,
}: {
  title: string
  headline: string
  delta: string
  footer: string
}) {
  const t = useTranslations('landing')
  const cardRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'static' | 'armed' | 'play'>('static')
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = cardRef.current
    if (!el) return
    // Hide the reveal while below the fold, then play once the chart is ~⅓ in view.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: arm the client-only reveal before the observer plays it
    setPhase('armed')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase('play')
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div className="relative mt-16" aria-hidden>
      <div
        className="absolute -inset-x-12 -inset-y-8 rounded-[44px] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(233,64,143,0.16) 0%, rgba(233,64,143,0.04) 50%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="relative overflow-hidden rounded-[32px] border border-white/[0.12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background:
            'linear-gradient(180deg, #2c2622 0%, #221d19 35%, #181613 70%, #141110 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(233,64,143,0.16) 0%, transparent 65%)',
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
        <div ref={cardRef} className="absolute top-12 left-10 right-10 overflow-hidden rounded-[18px] border border-white/[0.10] bg-[#1a1a19] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/[0.05] px-7 py-4">
            <p className="font-display text-[14.5px] font-medium tracking-tight text-[#f5f5f4]">
              {title}
            </p>
          </div>
          <RevenueMetricStrip
            value1={headline}
            label1={t('revMetric1Label')}
            delta={delta}
            value2={t('revMetric2Value')}
            label2={t('revMetric2Label')}
            value3={t('revMetric3Value')}
            label3={t('revMetric3Label')}
            onTrackLabel={t('revOnTrack')}
            sinceLabel={t('revSinceLabel')}
            phase={phase}
          />
          <RevenueChartSVG nowLabel={t('revNowLabel')} projectedLabel={t('revProjectedLabel')} phase={phase} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] px-7 py-3.5 text-[12px] text-[#a8a29e]">
            <span>{footer}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-[11.5px] font-medium text-emerald-300">
              <span className="size-1 rounded-full bg-emerald-400" aria-hidden />
              {t('revStreakLabel')}
            </span>
          </div>
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-md"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 88%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 88%, black 100%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-sm"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 90%, black 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 90%, black 100%)',
            }}
            aria-hidden
          />
        </div>
        <div className="h-[640px]" aria-hidden />
      </div>
    </div>
  )
}

function CountUp({ value, phase }: { value: string; phase: 'static' | 'armed' | 'play' }) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    // The synchronous setDisplay calls reset the shown value when value/phase changes;
    // the count-up itself animates via rAF below.
    /* eslint-disable react-hooks/set-state-in-effect */
    const m = value.match(/^([^\d]*)([\d.,]+)(.*)$/)
    if (!m) {
      setDisplay(value)
      return
    }
    const prefix = m[1]
    const suffix = m[3]
    const target = parseInt(m[2].replace(/[.,]/g, ''), 10)
    const fmt = (n: number) => `${prefix}${n.toLocaleString('pt-BR')}${suffix}`
    if (phase === 'static' || !Number.isFinite(target)) {
      setDisplay(value)
      return
    }
    if (phase === 'armed') {
      setDisplay(fmt(0))
      return
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    const duration = 1600
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(fmt(Math.round(target * eased)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, value])
  return <>{display}</>
}

function RevenueMetricStrip({
  value1,
  label1,
  delta,
  value2,
  label2,
  value3,
  label3,
  onTrackLabel,
  sinceLabel,
  phase,
}: {
  value1: string
  label1: string
  delta: string
  value2: string
  label2: string
  value3: string
  label3: string
  onTrackLabel: string
  sinceLabel: string
  phase: 'static' | 'armed' | 'play'
}) {
  return (
    <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-b border-white/[0.05]">
      <div className="px-6 py-5">
        <p className="font-display text-[28px] font-medium leading-none tracking-[-0.015em] text-[#f5f5f4] md:text-[32px]">
          <CountUp value={value1} phase={phase} />
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-[11.5px] uppercase tracking-[0.10em] text-[#78716c]">{label1}</p>
        </div>
        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#e9408f]/10 px-2 py-0.5 font-mono text-[10.5px] tabular-nums text-[#f0a4c5]">
          <span className="size-1 rounded-full bg-[#e9408f]" aria-hidden />
          {delta}
        </p>
      </div>
      <div className="px-6 py-5">
        <p className="font-display text-[28px] font-medium leading-none tracking-[-0.015em] text-[#f5f5f4] md:text-[32px]">
          {value2}
        </p>
        <p className="mt-2 text-[11.5px] uppercase tracking-[0.10em] text-[#78716c]">{label2}</p>
        <p className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-[#a8a29e]">
          <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
            <path d="M2 9 L6 4 L10 9" fill="none" stroke="#e9408f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {onTrackLabel}
        </p>
      </div>
      <div className="px-6 py-5">
        <p className="font-display text-[28px] font-medium leading-none tracking-[-0.015em] text-[#f5f5f4] md:text-[32px]">
          {value3}
        </p>
        <p className="mt-2 text-[11.5px] uppercase tracking-[0.10em] text-[#78716c]">{label3}</p>
        <p className="mt-1.5 text-[10.5px] text-[#78716c]">{sinceLabel}</p>
      </div>
    </div>
  )
}

function RevenueChartSVG({
  nowLabel,
  projectedLabel,
  phase,
}: {
  nowLabel: string
  projectedLabel: string
  phase: 'static' | 'armed' | 'play'
}) {
  const cometSupported =
    typeof CSS !== 'undefined' && CSS.supports('offset-path', 'path("M0 0 L1 1")')
  // 36 cumulative monthly points: 24 actual (Jan 2024 → Dec 2025) + 4 actual (Jan-Apr 2026) + 8 projected (May-Dec 2026)
  // Numbers in thousands of R$.
  const cumulative = [
    // 2024 — slower start, single property
    5.7, 11.4, 17.1, 22.8, 28.5, 34.2, 39.9, 45.6, 51.3, 57.0, 62.7, 68.0,
    // 2025 — added 2nd property mid-year, growth accelerates
    74.3, 80.7, 87.0, 93.4, 99.7, 106.0, 112.4, 118.7, 125.1, 131.4, 137.8, 144.1,
    // 2026 Jan-Apr — 3 properties, steepest growth (4 actual months)
    151.2, 158.3, 165.4, 172.5,
    // 2026 May-Dec — projected, same slope (8 projected months)
    179.6, 186.7, 193.8, 200.9, 208.0, 215.1, 222.2, 229.3,
  ]
  const actualCount = 28 // index 0..27 = solid, index 28..35 = projected
  const max = 240
  const width = 760
  const height = 200
  const padX = 32
  const innerW = width - padX * 2

  const pointsCoords = cumulative.map((v, i) => {
    const x = padX + (i / (cumulative.length - 1)) * innerW
    const y = height - (v / max) * (height - 32) - 16
    return { x, y, value: v }
  })

  const actualPoints = pointsCoords.slice(0, actualCount)
  const projectedPoints = pointsCoords.slice(actualCount - 1) // overlap last actual point for continuity

  const actualPathD = actualPoints
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')
  const projectedPathD = projectedPoints
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')

  // Year boundaries — x positions for Jan 2024, Jan 2025, Jan 2026, "now" (after Apr 2026)
  const yearMarkers = [
    { label: '2024', i: 0 },
    { label: '2025', i: 12 },
    { label: '2026', i: 24 },
  ]
  const nowIndex = actualCount - 1
  const nowX = pointsCoords[nowIndex].x
  const nowY = pointsCoords[nowIndex].y

  return (
    <div className="px-2 pt-4 pb-2">
      <svg
        viewBox={`0 0 ${width} ${height + 32}`}
        className="block h-auto w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="rev-line-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#e9408f" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#e9408f" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e9408f" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="rev-area-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e9408f" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#e9408f" stopOpacity="0" />
          </linearGradient>
          <clipPath id="rev-area-clip">
            <rect
              x="0"
              y="0"
              width={width}
              height={height + 32}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'left',
                ...(phase === 'armed' ? { transform: 'scaleX(0)' } : {}),
              }}
              className={phase === 'play' ? 'animate-[reveal-x_1.6s_ease-out_both]' : undefined}
            />
          </clipPath>
        </defs>

        {/* Year gridlines */}
        {yearMarkers.map((m) => {
          const x = pointsCoords[m.i].x
          return (
            <g key={m.label}>
              <line
                x1={x}
                y1={16}
                x2={x}
                y2={height - 16}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text
                x={x}
                y={height + 18}
                textAnchor="start"
                className="fill-[#78716c]"
                style={{ font: "10px ui-monospace, monospace" }}
              >
                {m.label}
              </text>
            </g>
          )
        })}

        {/* "now" gridline + label */}
        <line
          x1={nowX}
          y1={16}
          x2={nowX}
          y2={height - 16}
          stroke="rgba(233,64,143,0.25)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={nowX + 6}
          y={26}
          textAnchor="start"
          className="fill-[#e9408f]"
          style={{ font: "10px ui-monospace, monospace" }}
        >
          {nowLabel}
        </text>

        {/* Area fill under actual path — wipes in left-to-right with the line */}
        <path
          d={`${actualPathD} L ${actualPoints[actualPoints.length - 1].x} ${height - 16} L ${actualPoints[0].x} ${height - 16} Z`}
          fill="url(#rev-area-gradient)"
          clipPath="url(#rev-area-clip)"
        />

        {/* Solid line: actual data — draws left-to-right on scroll-in (reduced-motion: instant) */}
        <path
          d={actualPathD}
          pathLength={1}
          fill="none"
          stroke="url(#rev-line-gradient)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={phase === 'armed' ? { strokeDasharray: 1, strokeDashoffset: 1 } : { strokeDasharray: 1 }}
          className={phase === 'play' ? 'animate-[draw-line_1.6s_ease-out_both]' : undefined}
        />

        {/* Comet riding the line's leading edge while it draws */}
        {phase === 'play' && cometSupported ? (
          <circle
            r="3.5"
            fill="#e9408f"
            className="rev-comet"
            style={{
              offsetPath: `path("${actualPathD}")`,
              filter: 'drop-shadow(0 0 5px rgba(233,64,143,0.9))',
            }}
          />
        ) : null}

        {/* Dotted line: projected */}
        <path
          d={projectedPathD}
          fill="none"
          stroke="#e9408f"
          strokeWidth="1.5"
          strokeOpacity="0.55"
          strokeDasharray="3 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* "Now" marker — continually pulses */}
        <circle cx={nowX} cy={nowY} r="4" fill="#e9408f" className="now-pulse" />
        <circle cx={nowX} cy={nowY} r="3.5" fill="#e9408f" />

        {/* End-of-projection ghost marker */}
        <circle
          cx={pointsCoords[pointsCoords.length - 1].x}
          cy={pointsCoords[pointsCoords.length - 1].y}
          r="3"
          fill="none"
          stroke="#e9408f"
          strokeOpacity="0.6"
          strokeWidth="1.2"
        />

        {/* "projected" label at end */}
        <text
          x={pointsCoords[pointsCoords.length - 1].x - 4}
          y={pointsCoords[pointsCoords.length - 1].y - 8}
          textAnchor="end"
          className="fill-[#a8a29e]"
          style={{ font: "9.5px ui-monospace, monospace" }}
        >
          {projectedLabel}
        </text>
      </svg>
    </div>
  )
}

function Comparison() {
  const t = useTranslations('landing')
  const rows = [
    { label: t('compRow1Label'), pm: t('compRow1PM'), mabenn: t('compRow1Mabenn') },
    { label: t('compRow2Label'), pm: t('compRow2PM'), mabenn: t('compRow2Mabenn') },
    { label: t('compRow3Label'), pm: t('compRow3PM'), mabenn: t('compRow3Mabenn') },
    { label: t('compRow4Label'), pm: t('compRow4PM'), mabenn: t('compRow4Mabenn') },
    { label: t('compRow5Label'), pm: t('compRow5PM'), mabenn: t('compRow5Mabenn') },
  ]
  return (
    <section id="comparison" className="relative px-6 py-32 md:py-40">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp delay={0.05}>
            <h2 className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.015em] text-[#f5f5f4] md:text-[48px]">
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
          <p className="mx-auto mt-16 max-w-3xl text-center font-display text-[22px] font-medium leading-[1.45] tracking-[-0.005em] text-[#f5f5f4] md:text-[26px]">
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
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#78716c]">{colPM}</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#f5f5f4]">{colMabenn}</p>
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
            <p className="text-[12.5px] uppercase tracking-[0.10em] text-[#78716c]">{row.label}</p>
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
            <p className="border-b border-white/[0.05] px-5 py-3 text-[11.5px] uppercase tracking-[0.12em] text-[#a8a29e]">
              {row.label}
            </p>
            <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
              <div className="px-5 py-4">
                <p className="text-[10.5px] uppercase tracking-[0.12em] text-[#78716c]">{colPM}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#a8a29e]">{row.pm}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10.5px] uppercase tracking-[0.12em] text-[#f5f5f4]/80">{colMabenn}</p>
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
            <h2 className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.015em] text-[#f5f5f4] md:text-[48px]">
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
                className="animate-[fade-in_280ms_ease-out_both] font-display text-[52px] font-medium leading-none tracking-[-0.02em] text-[#f5f5f4]"
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

          <WaitlistCta variant="pricing" />
        </div>

        <div className="border-t border-white/[0.06] bg-[#e9408f]/[0.06] px-7 py-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9408f]/15 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.10em] text-[#f0a4c5]">
            <svg viewBox="0 0 12 12" className="size-2.5 fill-[#e9408f]" aria-hidden>
              <path d="M6 0.5 L7.4 4.1 L11.3 4.4 L8.3 6.9 L9.2 10.8 L6 8.7 L2.8 10.8 L3.7 6.9 L0.7 4.4 L4.6 4.1 Z" />
            </svg>
            {t('pricingFoundingBadge')}
          </span>
          <p className="mt-2.5 text-[13px] leading-[1.55] text-[#d6d3d1]">{t('pricingFoundingBody')}</p>
        </div>
      </div>
    </div>
  )
}

function TwoSides() {
  const t = useTranslations('landing')
  const llBullets = [
    t('llBullet1'),
    t('llBullet2'),
    t('llBullet3'),
    t('llBullet4'),
    t('llBullet5'),
  ]
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
          <h2 className="mx-auto max-w-3xl text-center font-display text-[34px] font-medium leading-[1.05] tracking-[-0.015em] text-[#f5f5f4] md:text-[44px]">
            {t('twoSidesTitle')}
          </h2>
        </FadeUp>
        <div className="mt-16 grid gap-12 md:gap-0 lg:grid-cols-2 lg:divide-x lg:divide-white/[0.06]">
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
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#78716c]">
        {header}
      </p>
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
