import { RULES } from "../api";
import { cancelRuleText, dailyLimitText, plural, scheduleText } from "../lib/format";
import { institutionName, LEGAL } from "./config";

// Textos de la Política de privacidad y de los Términos de uso.
// Están escritos como bloques para que la pantalla legal arme el índice y los títulos sola.

export type Block = string | { list: string[] };
export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}
export interface LegalDoc {
  key: "privacidad" | "terminos";
  title: string;
  intro: string;
  sections: Section[];
}

const contactChannel = () =>
  LEGAL.privacyEmail
    ? `escribiendo al correo ${LEGAL.privacyEmail}`
    : "a través del administrador de Espacia o de la dependencia de biblioteca de tu institución";

export function privacyPolicy(): LegalDoc {
  const inst = institutionName();
  return {
    key: "privacidad",
    title: "Política de tratamiento de datos personales",
    intro:
      `Esta política explica qué datos personales se recogen al usar Espacia, para qué se usan, cómo se protegen y qué derechos tienes sobre ellos. ` +
      `Se expide en cumplimiento de la Ley Estatutaria 1581 de 2012 y del Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).`,
    sections: [
      {
        id: "responsable",
        title: "1. Responsable y encargado del tratamiento",
        blocks: [
          `El responsable del tratamiento de tus datos es ${inst}, que decide para qué se usan y presta el servicio de reservas a su comunidad (en adelante, "la Institución").`,
          `Espacia es la plataforma tecnológica que la Institución usa para gestionar las reservas. Cuando el proveedor de Espacia aloja o mantiene la plataforma, actúa como encargado del tratamiento: solo trata los datos por cuenta de la Institución y según sus instrucciones.`,
        ],
      },
      {
        id: "datos",
        title: "2. Datos que se recogen",
        blocks: [
          "Solo se piden los datos necesarios para prestar el servicio:",
          {
            list: [
              "Datos de identificación y contacto: nombre completo y correo electrónico.",
              "Datos de la cuenta: rol (estudiante, funcionario o administrador), estado de la cuenta y contraseña. La contraseña se guarda cifrada con un algoritmo de un solo sentido: nadie, ni siquiera el administrador, puede verla.",
              "Datos de uso del servicio: reservas (espacio o equipo, fecha, horario, motivo y estado), registro de llegadas, devoluciones, cancelaciones e inasistencias, notificaciones e incidencias de soporte que reportes.",
              "Datos técnicos de seguridad: fecha de creación de la cuenta, fecha de aceptación de esta política, último cambio de contraseña e intentos fallidos de inicio de sesión.",
            ],
          },
          "Espacia no solicita datos sensibles (como origen étnico, salud, orientación política o religiosa, ni datos biométricos) ni información de pago.",
        ],
      },
      {
        id: "finalidades",
        title: "3. Para qué se usan tus datos",
        blocks: [
          {
            list: [
              "Crear y administrar tu cuenta, y verificar tu identidad al iniciar sesión.",
              "Gestionar tus reservas: disponibilidad, confirmación, extensión, cancelación, validación de llegada, devolución de equipos y liberación por inasistencia.",
              "Enviarte por correo y dentro de la aplicación confirmaciones, recordatorios, avisos de cambios en tus reservas y mensajes para recuperar tu contraseña.",
              "Aplicar las reglas de uso de los espacios y equipos de la Institución.",
              "Elaborar estadísticas de ocupación para que la Institución administre mejor sus espacios. Estas estadísticas se presentan de forma agregada.",
              "Proteger la plataforma: prevenir accesos indebidos, bloquear temporalmente cuentas tras varios intentos fallidos y atender incidentes de seguridad.",
              "Atender tus consultas, reclamos y solicitudes sobre tus datos personales.",
            ],
          },
          "Tus datos no se venden ni se usan con fines publicitarios.",
        ],
      },
      {
        id: "autorizacion",
        title: "4. Autorización",
        blocks: [
          "Al crear tu cuenta marcas una casilla con la que autorizas el tratamiento de tus datos para las finalidades descritas. Sin esa autorización no es posible crear la cuenta, porque los datos son indispensables para prestar el servicio.",
          `La plataforma guarda la fecha en que diste la autorización y la versión de esta política que aceptaste, para poder demostrarla cuando la pidas. Las cuentas de funcionarios y administradores las crea la Institución en el marco de su relación con esas personas.`,
        ],
      },
      {
        id: "derechos",
        title: "5. Tus derechos",
        blocks: [
          "Como titular de los datos tienes derecho a:",
          {
            list: [
              "Conocer, actualizar y rectificar tus datos personales.",
              "Solicitar prueba de la autorización que otorgaste.",
              "Ser informado, previa solicitud, sobre el uso que se ha dado a tus datos.",
              "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley, después de haber agotado el trámite de consulta o reclamo ante la Institución.",
              "Revocar la autorización y pedir que tus datos se supriman, cuando no exista un deber legal o contractual que obligue a conservarlos.",
              "Acceder de forma gratuita a tus datos personales.",
            ],
          },
          "Puedes actualizar tu contraseña en cualquier momento desde el menú de la aplicación.",
        ],
      },
      {
        id: "procedimiento",
        title: "6. Cómo hacer consultas y reclamos",
        blocks: [
          `Puedes ejercer tus derechos ${contactChannel()}. Indica tu nombre, el correo de tu cuenta y lo que solicitas.`,
          {
            list: [
              "Consultas (por ejemplo, saber qué datos tuyos están registrados): se responden en un máximo de 10 días hábiles, prorrogables por 5 días hábiles más si es necesario, informándote el motivo.",
              "Reclamos (corrección, actualización, supresión o incumplimiento): se responden en un máximo de 15 días hábiles, prorrogables por 8 días hábiles más, informándote el motivo.",
            ],
          },
          "Si tu solicitud está incompleta, se te pedirá completarla dentro de los 5 días hábiles siguientes. Si pasan 2 meses sin respuesta de tu parte, se entenderá que desististe.",
        ],
      },
      {
        id: "seguridad",
        title: "7. Seguridad de la información",
        blocks: [
          "Se aplican medidas técnicas y administrativas razonables para proteger tus datos, entre ellas:",
          {
            list: [
              "Contraseñas cifradas y nunca visibles para nadie.",
              "Acceso por roles: cada persona solo ve la información que necesita para su función.",
              "Bloqueo temporal de la cuenta tras varios intentos fallidos de inicio de sesión.",
              "Cierre de todas las sesiones abiertas cuando cambias o restableces tu contraseña.",
              "Enlaces de recuperación de contraseña de un solo uso y con vencimiento.",
              "Conexiones cifradas (HTTPS) cuando la plataforma se publica en internet.",
            ],
          },
          "Ningún sistema es completamente invulnerable. Si ocurre un incidente que afecte tus datos, la Institución lo gestionará e informará conforme a la ley.",
        ],
      },
      {
        id: "terceros",
        title: "8. Proveedores y transferencia de datos",
        blocks: [
          "Para funcionar, la plataforma puede apoyarse en proveedores de alojamiento en la nube y de envío de correo electrónico. Ellos tratan los datos solo para prestar ese servicio, bajo acuerdos de confidencialidad y seguridad.",
          "Si esos servidores están fuera de Colombia, la transmisión se hará a países con niveles adecuados de protección o con las garantías que exige la ley. Tus datos no se comparten con terceros para otros fines, salvo requerimiento de una autoridad competente.",
        ],
      },
      {
        id: "conservacion",
        title: "9. Tiempo de conservación",
        blocks: [
          "Los datos se conservan mientras tu cuenta esté activa y durante el tiempo necesario para cumplir las finalidades de esta política y las obligaciones legales de la Institución. Después se eliminan o se anonimizan, de modo que ya no te identifiquen.",
        ],
      },
      {
        id: "navegador",
        title: "10. Almacenamiento en tu navegador",
        blocks: [
          "Espacia guarda en tu navegador la sesión iniciada y la pantalla que tenías abierta, para que no tengas que volver a entrar al recargar la página. No usa cookies de publicidad ni herramientas de rastreo.",
          "Al cargar la aplicación, tu navegador puede descargar tipografías y fotografías de servicios externos (como Google Fonts o Unsplash); esos servicios pueden registrar datos técnicos de la conexión, como la dirección IP, según sus propias políticas.",
        ],
      },
      {
        id: "menores",
        title: "11. Menores de edad",
        blocks: [
          "Si eres menor de edad, solo puedes registrarte con la autorización de tu representante legal. El tratamiento de tus datos respetará siempre tu interés superior y tus derechos fundamentales.",
        ],
      },
      {
        id: "cambios",
        title: "12. Cambios a esta política",
        blocks: [
          `Cualquier cambio importante se informará dentro de la aplicación antes de aplicarse. Esta es la versión ${LEGAL.version}, vigente desde el ${LEGAL.effectiveDate} en ${LEGAL.city}.`,
        ],
      },
    ],
  };
}

export function termsOfUse(): LegalDoc {
  const inst = institutionName();
  return {
    key: "terminos",
    title: "Términos y condiciones de uso",
    intro:
      `Estos términos regulan el uso de Espacia, la plataforma con la que ${inst} gestiona la reserva de salas de estudio, equipos y talleres. ` +
      "Al crear una cuenta o usar la plataforma aceptas estas condiciones.",
    sections: [
      {
        id: "servicio",
        title: "1. El servicio",
        blocks: [
          "Espacia permite consultar la disponibilidad de espacios y equipos en tiempo real, reservarlos, recibir confirmaciones y recordatorios, y que el personal de la biblioteca registre llegadas, devoluciones e incidencias.",
          "La Institución define qué espacios ofrece, su estado (activo, en mantenimiento o inactivo) y quién puede usarlos.",
        ],
      },
      {
        id: "cuenta",
        title: "2. Tu cuenta",
        blocks: [
          {
            list: [
              "Debes registrarte con datos verdaderos y con un correo al que tengas acceso.",
              "Tu cuenta es personal e intransferible. Eres responsable de lo que se haga con ella y de mantener tu contraseña en secreto.",
              "Si sospechas que alguien conoce tu contraseña, cámbiala de inmediato: al hacerlo se cierran todas las sesiones abiertas.",
              "Las cuentas de funcionarios y administradores solo las crea la Institución.",
            ],
          },
        ],
      },
      {
        id: "reservas",
        title: "3. Reglas de reserva",
        blocks: [
          {
            list: [
              `Las reservas se hacen dentro del horario de ${scheduleText()} y por un máximo de ${plural(RULES.maxHours, "hora", "horas")} cada una.`,
              `Puedes tener hasta ${plural(RULES.maxActive, "reserva activa", "reservas activas")} al mismo tiempo y reservar con hasta ${plural(RULES.daysAhead, "día", "días")} de anticipación.`,
              `Por día puedes reservar hasta ${dailyLimitText()}.`,
              `${cancelRuleText()}, sin consecuencia. Si ya no necesitas el espacio, cancélalo para que otra persona pueda usarlo.`,
              "Puedes extender una reserva 1 hora si el espacio está libre, sin superar el máximo de horas ni el horario de cierre.",
              `Debes presentarte al personal al llegar. Si nadie valida tu llegada en los primeros ${RULES.noShowMinutes} minutos, la reserva se marca como no asistida y el espacio queda libre. Las reservas no asistidas cuentan para el límite diario.`,
            ],
          },
        ],
      },
      {
        id: "uso",
        title: "4. Uso de espacios y equipos",
        blocks: [
          {
            list: [
              "Usa los espacios y equipos solo para fines académicos o los autorizados por la Institución, y respeta su reglamento interno.",
              "Los equipos se devuelven al personal en el mismo estado en que se entregaron y dentro del horario reservado.",
              "Los daños, pérdidas o retrasos en la devolución se gestionan según el reglamento de la Institución.",
              "Reporta cualquier falla o daño al personal para que se registre como incidencia.",
            ],
          },
        ],
      },
      {
        id: "prohibido",
        title: "5. Conductas no permitidas",
        blocks: [
          {
            list: [
              "Suplantar a otra persona o usar la cuenta de alguien más.",
              "Hacer reservas que no vas a usar o acaparar espacios de forma reiterada.",
              "Intentar acceder a información o funciones que no corresponden a tu rol.",
              "Usar programas automáticos para reservar o interferir con el funcionamiento de la plataforma.",
            ],
          },
          "El incumplimiento de estas reglas puede llevar a que la Institución anule reservas o suspenda la cuenta, sin perjuicio de las medidas de su reglamento.",
        ],
      },
      {
        id: "disponibilidad",
        title: "6. Disponibilidad del servicio",
        blocks: [
          "La plataforma se ofrece de forma continua, pero puede tener interrupciones por mantenimiento, actualizaciones o causas ajenas al control de la Institución. En esos casos se procurará restablecer el servicio lo antes posible.",
          "La disponibilidad que muestra la plataforma depende de la información registrada por la Institución.",
        ],
      },
      {
        id: "datos",
        title: "7. Datos personales",
        blocks: [
          "El tratamiento de tus datos se rige por la Política de tratamiento de datos personales, que forma parte de estos términos.",
        ],
      },
      {
        id: "propiedad",
        title: "8. Propiedad intelectual",
        blocks: [
          "El software Espacia, su diseño, su nombre y su logotipo están protegidos por derechos de autor y pertenecen a su titular. Su uso por parte de la Institución se rige por el acuerdo de licencia correspondiente.",
          "No está permitido copiar, modificar, distribuir ni hacer ingeniería inversa del software. Las fotografías e ilustraciones de los espacios pertenecen a sus respectivos autores o a la Institución.",
        ],
      },
      {
        id: "responsabilidad",
        title: "9. Responsabilidad",
        blocks: [
          "Cada usuario responde por el uso que hace de su cuenta y de los espacios y equipos que reserva. La Institución no responde por pérdidas derivadas de un uso indebido de la plataforma por parte de los usuarios, ni por objetos personales dejados en los espacios.",
        ],
      },
      {
        id: "cambios",
        title: "10. Cambios y legislación aplicable",
        blocks: [
          "Las reglas de reserva de la sección 3 son las vigentes en este momento: la Institución puede ajustarlas según su reglamento y siempre se muestran actualizadas en la aplicación.",
          "Estos términos pueden actualizarse; los cambios importantes se informarán dentro de la aplicación.",
          `Se rigen por las leyes de la República de Colombia. Versión ${LEGAL.version}, vigente desde el ${LEGAL.effectiveDate} en ${LEGAL.city}.`,
        ],
      },
    ],
  };
}
