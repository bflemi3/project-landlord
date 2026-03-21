import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  const interBold = await fetch(
    new URL('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf'),
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1a',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow behind wordmark */}
        <div
          style={{
            position: 'absolute',
            width: '800px',
            height: '500px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -55%)',
            background: 'radial-gradient(ellipse, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0.08) 40%, transparent 70%)',
          }}
        />

        {/* Content — shifted slightly above center */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '-40px',
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              marginBottom: 20,
            }}
          >
            mabenn
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Shared billing you can trust
          </div>
        </div>

        {/* Domain at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: 16,
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.25)',
            letterSpacing: '2px',
          }}
        >
          mabenn.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: interBold,
          style: 'normal',
          weight: 700,
        },
      ],
    },
  )
}
