import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'
import { marketingLocaleFromHost, MARKETING_META, MARKETING_ORIGIN } from '@/lib/marketing-meta'
import { FRAUNCES_600_BASE64, GEIST_400_BASE64, GEIST_500_BASE64 } from './og-font'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// Locale-neutral: the headline language lives in the rendered image, not the alt.
export const alt = 'Mabenn'

const fraunces = Buffer.from(FRAUNCES_600_BASE64, 'base64')
const geist400 = Buffer.from(GEIST_400_BASE64, 'base64')
const geist500 = Buffer.from(GEIST_500_BASE64, 'base64')

export default async function OpengraphImage() {
  const host = (await headers()).get('host')
  const locale = marketingLocaleFromHost(host)
  const meta = MARKETING_META[locale]
  const origin = MARKETING_ORIGIN[locale]

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#141413',
        padding: '80px',
        fontFamily: 'Fraunces',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 32,
          fontWeight: 400,
          color: '#a8a29e',
          letterSpacing: '0.01em',
          marginBottom: 24,
        }}
      >
        mabenn
      </div>
      <div
        style={{
          width: 72,
          height: 6,
          backgroundColor: '#e9408f',
          borderRadius: 3,
          marginBottom: 36,
        }}
      />
      <div
        style={{
          display: 'flex',
          fontSize: 78,
          fontWeight: 600,
          lineHeight: 1.05,
          color: '#f5f5f4',
          maxWidth: 980,
        }}
      >
        {meta.ogTitle}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 32,
          fontFamily: 'Geist',
          fontSize: 34,
          fontWeight: 500,
          color: '#a8a29e',
        }}
      >
        {meta.ogKicker}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 28,
          fontFamily: 'Geist',
          fontSize: 24,
          fontWeight: 400,
          color: '#78716c',
        }}
      >
        {origin.replace('https://', '')}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Fraunces', data: fraunces, weight: 600, style: 'normal' },
        { name: 'Geist', data: geist400, weight: 400, style: 'normal' },
        { name: 'Geist', data: geist500, weight: 500, style: 'normal' },
      ],
    },
  )
}
