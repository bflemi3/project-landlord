import { type EmailLocale, getAuthEmailTranslations } from './i18n.ts'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function buildLayout({
  preview,
  locale,
  baseUrl,
  content,
}: {
  preview: string
  locale: EmailLocale
  baseUrl: string
  content: string
}): string {
  const t = getAuthEmailTranslations(locale)
  const lang = locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es' : 'en'

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="${lang}">
  <head>
    <link rel="preload" as="image" href="${baseUrl}/brand/wordmark-light.png" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="light only" name="color-scheme" />
    <meta content="light" name="supported-color-schemes" />
  </head>
  <body style="background-color:rgb(255,255,255);margin:0;padding:0">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
      <tbody>
        <tr>
          <td style='margin:auto;background-color:rgb(255,255,255);padding-right:8px;padding-left:8px;font-family:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"'>
            <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0" data-skip-in-text="true">${escapeHtml(preview)}</div>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:30rem;margin:40px auto;padding:0 24px">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="text-align:center;margin-bottom:32px">
                      <tbody>
                        <tr>
                          <td>
                            <img alt="mabenn" height="28" src="${baseUrl}/brand/wordmark-light.png" style="display:block;outline:none;border:none;text-decoration:none;margin:0 auto;font-family:Inter,sans-serif;font-weight:700;font-size:24px;color:#18181b" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:rgb(255,255,255);border-radius:1rem;border:1px solid rgb(228,228,231);overflow:hidden">
                      <tbody>
                        <tr>
                          <td>
                            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px">
                              <tbody>
                                <tr>
                                  <td>${content}</td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr style="width:100%;border:none;border-top:1px solid rgb(228,228,231);margin:32px 0" />
                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="text-align:center">
                      <tbody>
                        <tr>
                          <td>
                            <p style="font-size:14px;line-height:20px;color:rgb(161,161,170);margin:0">${escapeHtml(t.footer)}</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`
}

function buildButton(href: string, label: string): string {
  return `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:8px 0">
  <tbody>
    <tr>
      <td>
        <a href="${escapeHtml(href)}" style="line-height:24px;text-decoration:none;display:block;max-width:100%;background-color:rgb(20,184,166);border-radius:0.75rem;font-weight:700;color:rgb(255,255,255);font-size:16px;text-align:center;padding:12px 24px" target="_blank">
          <span><!--[if mso]><i style="mso-font-width:400%;mso-text-raise:18" hidden>&#8202;&#8202;&#8202;</i><![endif]--></span>
          <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">${escapeHtml(label)}</span>
          <span><!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8202;&#8203;</i><![endif]--></span>
        </a>
      </td>
    </tr>
  </tbody>
</table>`
}

export function buildConfirmEmailHtml({
  confirmUrl,
  name,
  locale = 'en',
  baseUrl,
}: {
  confirmUrl: string
  name?: string
  locale?: EmailLocale
  baseUrl: string
}): string {
  const t = getAuthEmailTranslations(locale).confirmEmail
  const body = name ? t.bodyWithName(name) : t.body

  const content = `
    <p style="font-size:24px;line-height:32px;font-weight:700;color:rgb(24,24,27);margin:0 0 16px 0">${escapeHtml(t.heading)}</p>
    <p style="font-size:16px;line-height:24px;color:rgb(82,82,91);margin:0 0 24px 0">${escapeHtml(body)}</p>
    ${buildButton(confirmUrl, t.button)}
    <p style="font-size:14px;line-height:20px;color:rgb(161,161,170);margin:8px 0 0 0">${escapeHtml(t.hint)}</p>`

  return buildLayout({ preview: t.preview, locale, baseUrl, content })
}

export function buildResetPasswordHtml({
  resetUrl,
  locale = 'en',
  baseUrl,
}: {
  resetUrl: string
  locale?: EmailLocale
  baseUrl: string
}): string {
  const t = getAuthEmailTranslations(locale).resetPassword

  const content = `
    <p style="font-size:24px;line-height:32px;font-weight:700;color:rgb(24,24,27);margin:0 0 16px 0">${escapeHtml(t.heading)}</p>
    <p style="font-size:16px;line-height:24px;color:rgb(82,82,91);margin:0 0 24px 0">${escapeHtml(t.body)}</p>
    ${buildButton(resetUrl, t.button)}
    <p style="font-size:14px;line-height:20px;color:rgb(161,161,170);margin:8px 0 0 0">${escapeHtml(t.hint)}</p>`

  return buildLayout({ preview: t.preview, locale, baseUrl, content })
}
