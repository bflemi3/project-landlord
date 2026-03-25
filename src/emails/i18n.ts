export type EmailLocale = 'en' | 'pt-BR' | 'es'
export type InviteSource = 'waitlist' | 'direct'
export type TenantInviteParams = { tenantName: string | null; landlordName: string; propertyName: string }

export const emailTranslations = {
  en: {
    footer: '© 2026 mabenn · Shared billing you can trust',
    confirmEmail: {
      subject: 'Confirm your email',
      preview: 'Confirm your email to get started with mabenn',
      heading: 'Confirm your email',
      body: 'Thanks for signing up. Confirm your email below and you\'ll be all set to get started.',
      bodyWithName: (name: string) => `Hi ${name}, thanks for signing up. Confirm your email below and you'll be all set to get started.`,
      button: 'Confirm Email',
      hint: 'If you didn\'t create an account, you can safely ignore this email.',
    },
    resetPassword: {
      subject: 'Reset your password',
      preview: 'Reset your mabenn password',
      heading: 'Reset your password',
      body: 'We received a request to reset your password. Click below to set a new one.',
      button: 'Reset Password',
      hint: 'If you didn\'t request this, you can safely ignore this email. Your password won\'t change.',
    },
    waitlistWelcome: {
      subject: "You're on the mabenn waitlist!",
      preview: "You're on the mabenn waitlist — here's what's coming",
      heading: "You're on the list!",
      body: "Thanks for signing up for early access. We'll send you an invite code when your spot is ready.",
      whatsComingTitle: "Here's what's coming:",
      benefit1: 'Set up properties, configure rent and bills in minutes',
      benefit2: 'Forward bills and we pull out the numbers for you',
      benefit3: 'Publish clear monthly statements everyone can trust',
      closingLine: "We're building mabenn for people who want billing to be simple and transparent. Stay tuned.",
      signoff: '— The mabenn team',
    },
    inviteCode: {
      waitlist: {
        subject: 'Time to get started — your mabenn invite is ready',
        preview: 'Time to get started — your mabenn invite is ready',
        heading: 'Time to get started',
        body: "Thanks for your patience. We've been building something we think you'll love — a simpler, clearer way to handle shared billing. Use the code below to create your account.",
      },
      direct: {
        subject: "You're invited to mabenn",
        preview: "You're invited to mabenn",
        heading: "You're invited to mabenn",
        body: "You've been invited to join mabenn — a simpler, clearer way to handle shared billing. Use the code below to create your account.",
      },
      button: 'Create Your Account',
      hint: 'This code is unique to you and expires in 30 days. If you have any questions, just reply to this email.',
    },
    tenantInvite: {
      subject: (propertyName: string) => `You're invited to join ${propertyName} on mabenn`,
      greeting: (name: string | null) => name ? `Hi ${name},` : 'Hi,',
      body: (landlordName: string, propertyName: string) =>
        `${landlordName} has invited you to join <strong>${propertyName}</strong> on mabenn. You'll be able to view your monthly statements, see charge details, and track payments.`,
      button: 'Join on mabenn',
      hint: 'If you didn\'t expect this invite, you can safely ignore this email.',
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
    waitlistWelcome: {
      subject: 'Você está na lista de espera do mabenn!',
      preview: 'Você está na lista de espera do mabenn — veja o que está por vir',
      heading: 'Você está na lista!',
      body: 'Obrigado por se inscrever para acesso antecipado. Enviaremos um código de convite quando sua vaga estiver pronta.',
      whatsComingTitle: 'O que está por vir:',
      benefit1: 'Configure imóveis, defina aluguel e contas em minutos',
      benefit2: 'Encaminhe contas e nós separamos os valores para você',
      benefit3: 'Publique extratos mensais claros em que todos confiam',
      closingLine: 'Estamos construindo o mabenn para pessoas que querem que a cobrança seja simples e transparente. Fique atento.',
      signoff: '— A equipe mabenn',
    },
    inviteCode: {
      waitlist: {
        subject: 'Hora de começar — seu convite do mabenn está pronto',
        preview: 'Hora de começar — seu convite do mabenn está pronto',
        heading: 'Hora de começar',
        body: 'Obrigado pela paciência. Estivemos construindo algo que achamos que você vai adorar — uma forma mais simples e clara de lidar com cobranças compartilhadas. Use o código abaixo para criar sua conta.',
      },
      direct: {
        subject: 'Você foi convidado para o mabenn',
        preview: 'Você foi convidado para o mabenn',
        heading: 'Você foi convidado para o mabenn',
        body: 'Você foi convidado a se juntar ao mabenn — uma forma mais simples e clara de lidar com cobranças compartilhadas. Use o código abaixo para criar sua conta.',
      },
      button: 'Criar Sua Conta',
      hint: 'Este código é único para você e expira em 30 dias. Se tiver alguma dúvida, basta responder a este e-mail.',
    },
    tenantInvite: {
      subject: (propertyName: string) => `Você foi convidado para ${propertyName} no mabenn`,
      greeting: (name: string | null) => name ? `Olá ${name},` : 'Olá,',
      body: (landlordName: string, propertyName: string) =>
        `${landlordName} convidou você para participar de <strong>${propertyName}</strong> no mabenn. Você poderá ver seus extratos mensais, detalhes das cobranças e acompanhar pagamentos.`,
      button: 'Entrar no mabenn',
      hint: 'Se você não esperava este convite, pode ignorar este e-mail com segurança.',
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
    waitlistWelcome: {
      subject: '¡Estás en la lista de espera de mabenn!',
      preview: 'Estás en la lista de espera de mabenn — esto es lo que viene',
      heading: '¡Estás en la lista!',
      body: 'Gracias por inscribirte para acceso anticipado. Te enviaremos un código de invitación cuando tu lugar esté listo.',
      whatsComingTitle: 'Esto es lo que viene:',
      benefit1: 'Configura propiedades, define renta y cuentas en minutos',
      benefit2: 'Reenvía facturas y separamos los números por ti',
      benefit3: 'Publica estados de cuenta mensuales claros en los que todos confían',
      closingLine: 'Estamos construyendo mabenn para personas que quieren que la facturación sea simple y transparente. Mantente atento.',
      signoff: '— El equipo mabenn',
    },
    inviteCode: {
      waitlist: {
        subject: 'Es hora de empezar — tu invitación de mabenn está lista',
        preview: 'Es hora de empezar — tu invitación de mabenn está lista',
        heading: 'Es hora de empezar',
        body: 'Gracias por tu paciencia. Hemos estado construyendo algo que creemos que te encantará — una forma más simple y clara de manejar la facturación compartida. Usa el código a continuación para crear tu cuenta.',
      },
      direct: {
        subject: 'Estás invitado a mabenn',
        preview: 'Estás invitado a mabenn',
        heading: 'Estás invitado a mabenn',
        body: 'Has sido invitado a unirte a mabenn — una forma más simple y clara de manejar la facturación compartida. Usa el código a continuación para crear tu cuenta.',
      },
      button: 'Crear Tu Cuenta',
      hint: 'Este código es único para ti y expira en 30 días. Si tienes alguna pregunta, solo responde a este correo.',
    },
    tenantInvite: {
      subject: (propertyName: string) => `Te invitaron a unirte a ${propertyName} en mabenn`,
      greeting: (name: string | null) => name ? `Hola ${name},` : 'Hola,',
      body: (landlordName: string, propertyName: string) =>
        `${landlordName} te invitó a unirte a <strong>${propertyName}</strong> en mabenn. Podrás ver tus estados de cuenta mensuales, detalles de cargos y seguimiento de pagos.`,
      button: 'Unirse a mabenn',
      hint: 'Si no esperabas esta invitación, puedes ignorar este correo de forma segura.',
    },
  },
} as const

export function getEmailTranslations(locale: EmailLocale) {
  return emailTranslations[locale] ?? emailTranslations.en
}
