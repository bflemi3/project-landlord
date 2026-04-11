'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Building2, FileScan, FileCheck, ShieldCheck, Check } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { FadeUp } from '@/components/fade-up'
import { Wordmark } from '@/components/wordmark'
import { WaitlistForm } from './waitlist-form'
import { WaitlistProvider } from './waitlist-context'

export function Landing() {
  const t = useTranslations('landing')

  const steps = [
    { icon: Building2, title: t('step1Title'), description: t('step1Description') },
    { icon: FileScan, title: t('step2Title'), description: t('step2Description') },
    { icon: FileCheck, title: t('step3Title'), description: t('step3Description') },
    { icon: ShieldCheck, title: t('step4Title'), description: t('step4Description') },
  ]

  const landlordBenefits = [
    t('landlordBenefit1'),
    t('landlordBenefit2'),
    t('landlordBenefit3'),
    t('landlordBenefit4'),
  ]

  const tenantBenefits = [
    t('tenantBenefit1'),
    t('tenantBenefit2'),
    t('tenantBenefit3'),
    t('tenantBenefit4'),
  ]

  return (
    <WaitlistProvider>
    <div className="mx-auto min-h-svh max-w-2xl">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5">
        <Wordmark className="h-7" />
        <Link href="/auth/sign-in" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'rounded-xl')}>
          {t('signIn')}
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-12 pb-16 md:pt-16 md:pb-20">
        {/* Layered glow system — origin at headline */}
        <div className="pointer-events-none absolute -inset-20 -left-60 -right-60" aria-hidden>
          {/* Light mode glow layers */}
          <div
            className="absolute h-[200px] w-[450px] rounded-full blur-[60px] dark:hidden"
            style={{
              left: 'calc(15% + 24px)',
              top: '15%',
              background: 'radial-gradient(ellipse, oklch(0.704 0.14 182.503 / 0.3) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute h-[350px] w-[700px] rounded-full blur-[90px] dark:hidden"
            style={{
              left: '10%',
              top: '5%',
              background: 'radial-gradient(ellipse at 30% 50%, oklch(0.704 0.14 182.503 / 0.15) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute h-[500px] w-[1100px] rounded-full blur-[130px] dark:hidden"
            style={{
              left: '-5%',
              top: '-5%',
              background: 'radial-gradient(ellipse at 35% 50%, oklch(0.704 0.14 182.503 / 0.07) 0%, transparent 70%)',
            }}
          />
          {/* Dark mode glow layers — stronger */}
          <div
            className="absolute hidden h-[200px] w-[450px] rounded-full blur-[60px] dark:block"
            style={{
              left: 'calc(15% + 24px)',
              top: '15%',
              background: 'radial-gradient(ellipse, oklch(0.704 0.14 182.503 / 0.45) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute hidden h-[350px] w-[700px] rounded-full blur-[90px] dark:block"
            style={{
              left: '10%',
              top: '5%',
              background: 'radial-gradient(ellipse at 30% 50%, oklch(0.704 0.14 182.503 / 0.25) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute hidden h-[500px] w-[1100px] rounded-full blur-[130px] dark:block"
            style={{
              left: '-5%',
              top: '-5%',
              background: 'radial-gradient(ellipse at 35% 50%, oklch(0.704 0.14 182.503 / 0.12) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative">
          <FadeUp delay={0.1}>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              {t('heroTitle')}
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 md:text-xl">
              {t('heroSubtitle')}
            </p>
          </FadeUp>
          <FadeUp delay={0.35}>
            <div className="mt-10">
              <WaitlistForm />
              <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {t('heroNote')}
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-12">
        <h2 className="mb-10 text-2xl font-bold tracking-tight">{t('howItWorksTitle')}</h2>
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

          {steps.map(({ icon: Icon, title, description }, index) => (
            <div key={title} className="relative flex gap-6 pb-8 last:pb-0">
              <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-background">
                <Icon className="size-5 text-primary" />
              </div>
              <div className="pt-1">
                <span className="text-xs font-medium uppercase tracking-widest text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-1 text-lg font-semibold">{title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-12">
        <div className="relative rounded-2xl bg-zinc-100 px-8 py-10 dark:bg-zinc-800/70">
          <div className="mb-5 h-1 w-10 rounded-full bg-primary" />
          <blockquote className="text-xl font-medium leading-relaxed italic text-foreground">
            &ldquo;{t('testimonialQuote')}&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            — {t('testimonialAuthor')}
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-12">
        <div className="space-y-12">
          <div>
            <h2 className="mb-6 text-2xl font-bold tracking-tight">{t('forLandlordsTitle')}</h2>
            <ul className="space-y-4">
              {landlordBenefits.map((benefit) => (
                <li key={benefit} className="flex gap-4 text-base text-muted-foreground">
                  <div className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="size-3 text-primary" />
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-6 text-2xl font-bold tracking-tight">{t('forTenantsTitle')}</h2>
            <ul className="space-y-4">
              {tenantBenefits.map((benefit) => (
                <li key={benefit} className="flex gap-4 text-base text-muted-foreground">
                  <div className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="size-3 text-primary" />
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-14">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">{t('ctaTitle')}</h2>
          <p className="mt-3 text-base text-muted-foreground">{t('ctaSubtitle')}</p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </div>
    </WaitlistProvider>
  )
}
