export type EmailLocale = 'en' | 'pt-BR' | 'es'

const translations = {
  en: {
    footer: '© 2026 mabenn · Shared billing you can trust',
    confirmEmail: {
      subject: 'Confirm your email',
      preview: 'Confirm your email to get started with mabenn',
      heading: 'Confirm your email',
      body: "Thanks for signing up. Confirm your email below and you'll be all set to get started.",
      bodyWithName: (name: string) => `Hi ${name}, thanks for signing up. Confirm your email below and you'll be all set to get started.`,
      button: 'Confirm Email',
      hint: "If you didn't create an account, you can safely ignore this email.",
    },
    resetPassword: {
      subject: 'Reset your password',
      preview: 'Reset your mabenn password',
      heading: 'Reset your password',
      body: 'We received a request to reset your password. Click below to set a new one.',
      button: 'Reset Password',
      hint: "If you didn't request this, you can safely ignore this email. Your password won't change.",
    },
  },
  'pt-BR': {
    footer: '© 2026 mabenn · Cobrança compartilhada em que você confia',
    confirmEmail: {
      subject: 'Confirme seu e-mail',
      preview: 'Confirme seu e-mail para começar a usar o mabenn',
      heading: 'Confirme seu e-mail',
      body: 'Obrigado por se cadastrar. Confirme seu e-mail abaixo e você estará pronto para começar.',
      bodyWithName: (name: string) => `Olá ${name}, obrigado por se cadastrar. Confirme seu e-mail abaixo e você estará pronto para começar.`,
      button: 'Confirmar E-mail',
      hint: 'Se você não criou uma conta, pode ignorar este e-mail com segurança.',
    },
    resetPassword: {
      subject: 'Redefinir sua senha',
      preview: 'Redefinir sua senha do mabenn',
      heading: 'Redefinir sua senha',
      body: 'Recebemos uma solicitação para redefinir sua senha. Clique abaixo para definir uma nova.',
      button: 'Redefinir Senha',
      hint: 'Se você não solicitou isso, pode ignorar este e-mail com segurança. Sua senha não será alterada.',
    },
  },
  es: {
    footer: '© 2026 mabenn · Facturación compartida en la que puedes confiar',
    confirmEmail: {
      subject: 'Confirma tu correo',
      preview: 'Confirma tu correo para empezar a usar mabenn',
      heading: 'Confirma tu correo',
      body: 'Gracias por registrarte. Confirma tu correo a continuación y estarás listo para empezar.',
      bodyWithName: (name: string) => `Hola ${name}, gracias por registrarte. Confirma tu correo a continuación y estarás listo para empezar.`,
      button: 'Confirmar Correo',
      hint: 'Si no creaste una cuenta, puedes ignorar este correo de forma segura.',
    },
    resetPassword: {
      subject: 'Restablecer tu contraseña',
      preview: 'Restablecer tu contraseña de mabenn',
      heading: 'Restablecer tu contraseña',
      body: 'Recibimos una solicitud para restablecer tu contraseña. Haz clic a continuación para establecer una nueva.',
      button: 'Restablecer Contraseña',
      hint: 'Si no solicitaste esto, puedes ignorar este correo de forma segura. Tu contraseña no cambiará.',
    },
  },
} as const

export function getAuthEmailTranslations(locale: EmailLocale) {
  return translations[locale] ?? translations.en
}
