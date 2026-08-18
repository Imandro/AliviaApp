export interface DailyReto {
  id: string;
  emoji: string;
  title: string;
  sub: string;
  steps: string[];
}

export interface Lucha {
  id: string;
  label: string;
  emoji: string;
  color: string;
  rgb: string;
  frases: { text: string; ref: string }[];
  retos: DailyReto[];
  saber: string[];
  tips: string[];
  guias: { title: string; desc: string }[];
  ideas: string[];
}

export const LUCHAS: Lucha[] = [
  {
    id: 'depresion',
    label: 'Depresión y tristeza',
    emoji: '✦',
    color: 'var(--accent-rose)',
    rgb: 'var(--accent-rose-rgb)',
    frases: [
      { text: 'La tristeza no te hace débil: solo significa que estás procesando algo importante. Un día a la vez.', ref: 'Un día a la vez' },
      { text: 'No tienes que sonreír para estar mejor. Basta un paso pequeño hoy, solo uno.', ref: 'Paso pequeño' },
      { text: 'Tu valor no depende de tu productividad. Descansar también es avanzar.', ref: 'Descanso valioso' },
    ],
    retos: [
      {
        id: 'dep-1',
        emoji: '◐',
        title: 'Sal a la luz del sol',
        sub: '10 minutos de aire antes del mediodía, sin necesitar ganas.',
        steps: [
          'Elige salir en la próxima hora',
          'Quédate 10 minutos sin teléfono',
          'Nota 2 cosas que sienta tu piel (sol, viento, frío)',
        ],
      },
      {
        id: 'dep-2',
        emoji: '✎',
        title: 'Mini bitácora de logros',
        sub: 'Escribe 3 cosas que sí lograste hoy, aunque parezcan mínimas.',
        steps: [
          'Anota 3 cosas que sí lograste hoy',
          'Léelas dos veces en voz baja',
          'Guárdalas: son evidencia de tu avance',
        ],
      },
      {
        id: 'dep-3',
        emoji: '✆',
        title: 'Rompe el silencio',
        sub: 'Cuéntale a alguien de confianza cómo te sientes hoy.',
        steps: [
          'Elige a una persona de confianza',
          'Escribe 1 línea de lo que le dirás',
          'Escríbele o llámale hoy',
        ],
      },
      {
        id: 'dep-4',
        emoji: '⇢',
        title: 'Plan de 10 minutos',
        sub: 'Una sola tarea pequeña, hecha al 50%, sin buscar perfección.',
        steps: [
          'Elige una tarea pequeña (agua, cama, un mensaje)',
          'Pon un temporizador mental de 10 minutos',
          'Hazla al 50%: lo hecho es suficiente',
        ],
      },
      {
        id: 'dep-5',
        emoji: '☾',
        title: 'Ancla de sueño',
        sub: 'Hoy duermes a horario: el sueño regular es tu mejor medicina.',
        steps: [
          'Define tu hora de dormir para esta noche',
          'Cierra pantallas 30 minutos antes',
          'Haz 4-7-8 en la cama: inhala 4, sostén 7, exhala 8',
        ],
      },
      {
        id: 'dep-6',
        emoji: '◉',
        title: 'Cazador de momentos buenos',
        sub: 'Atrapa 3 detalles buenos de tu día, aunque sean diminutos.',
        steps: [
          'Atrapa 3 momentos buenos del día',
          'Anótalos apenas los veas',
          'Dilos en voz alta antes de dormir',
        ],
      },
      {
        id: 'dep-7',
        emoji: '❦',
        title: 'Apoyo visible',
        sub: 'Avisa a un adulto de confianza que hoy es un día difícil.',
        steps: [
          'Elige a quién avisar',
          'Envía un mensaje corto pidiendo compañía',
          'Acepta su apoyo sin explicarlo todo',
        ],
      },
    ],
    saber: [
      'El desánimo sostenido nubla el juicio: interpretamos todo peor de lo que es. Por eso pedir una segunda opinión externa ayuda tanto.',
      'Dormir y comer a horarios regulares es uno de los antidepresivos naturales más potentes que existen.',
      'La depresión se alivia, no se "manda lejos": los días grises son terreno, no identidad.',
    ],
    tips: [
      'Sal a la luz del sol 10 minutos antes del mediodía',
      'Pospón decisiones grandes si llevas varios días muy abajo',
      'Si el ánimo no mejora en 2 semanas, busca ayuda profesional',
    ],
    guias: [
      { title: 'Entender la depresión en jóvenes', desc: 'Qué se siente, por qué pasa y cómo se distingue de la tristeza normal.' },
      { title: 'Señales de que necesitas ayuda ya', desc: 'Cuándo pedir apoyo, a quién y qué decir para hacerlo.' },
    ],
    ideas: [
      'Avisar a alguien de confianza cuando me siento mal',
      'Hacer una actividad física corta cada día',
      'Llevar una mini bitácora de pensamientos negativos',
    ],
  },
  {
    id: 'ansiedad',
    label: 'Ansiedad',
    emoji: '✦',
    color: 'var(--accent-warm)',
    rgb: 'var(--accent-warm-rgb)',
    frases: [
      { text: 'La ansiedad es tu alarma, no tu verdugo. Respira y baja el volumen: una cosa a la vez.', ref: 'Una cosa a la vez' },
      { text: 'Nada de lo que tu mente prevé se ha hecho realidad todavía. En este segundo estás a salvo.', ref: 'Aquí y ahora' },
      { text: 'No tienes que apagar la mente: solo cambiarle el canal más despacio.', ref: 'Bajar el volumen' },
    ],
    retos: [
      {
        id: 'ans-1',
        emoji: '≋',
        title: 'Respira 4-7-8 por 2 minutos',
        sub: 'La técnica que activa tu modo calma en menos de 60 segundos.',
        steps: [
          'Inhala por la nariz contando 4',
          'Sostén el aire contando 7',
          'Exhala lento contando 8',
          'Repite 4 ciclos completos',
        ],
      },
      {
        id: 'ans-2',
        emoji: '⊘',
        title: 'Día sin cafeína',
        sub: 'El cuerpo confunde "energía" con "peligro": hoy le das calma.',
        steps: [
          'Evita café, refrescos y energizantes hoy',
          'Elige agua o té de hierbas',
          'Anota cómo se siente tu cuerpo al final del día',
        ],
      },
      {
        id: 'ans-3',
        emoji: '✎',
        title: 'Caja de preocupaciones',
        sub: 'Planea 10 minutos y cierra el tema: planear no es rumiar.',
        steps: [
          'Escribe tu preocupación principal',
          'Anota 3 pasos realistas que darías',
          'Cierra el tema: "ya lo planee, sigo con mi día"',
        ],
      },
      {
        id: 'ans-4',
        emoji: '◔',
        title: 'Anclaje 5-4-3-2-1',
        sub: 'Vuelve a tus sentidos para salir del torbellino mental.',
        steps: [
          'Nombra 5 cosas que puedes ver',
          '4 cosas que puedes tocar',
          '3 cosas que puedes oír',
          '2 que hueles y 1 que saboreas',
        ],
      },
      {
        id: 'ans-5',
        emoji: '⇢',
        title: 'Paseo de 10 minutos',
        sub: 'Caminar al aire libre baja el cortisol y aclara la mente.',
        steps: [
          'Sal y camina 10 minutos',
          'Observa el cielo o los árboles, sin teléfono',
          'Vuelve con un foco nuevo para el resto del día',
        ],
      },
      {
        id: 'ans-6',
        emoji: '✧',
        title: 'Escenario catastrófico',
        sub: 'Escribe tu peor escenario: al verlo en papel, pierde poder.',
        steps: [
          'Escribe tu peor escenario',
          'Anota 3 cosas que harías si realmente pasara',
          'Pregúntate: ¿qué probabilidad real tiene?',
        ],
      },
      {
        id: 'ans-7',
        emoji: '↘',
        title: 'Una sola cosa a la vez',
        sub: 'Baja el volumen mental haciendo una sola tarea por bloque.',
        steps: [
          'Elige UNA tarea principal para hoy',
          'Apaga notificaciones mientras la haces',
          'Trabaja en bloques de 15 minutos',
        ],
      },
    ],
    saber: [
      'La respiración abdominal activa el sistema nervioso parasimpático (el "modo calma") en menos de 60 segundos.',
      'La cafeína y el azúcar intensifican los síntomas de la ansiedad: el cuerpo los lee como alarma.',
      'Preocuparse y planear son cosas distintas: planear 10 minutos y cerrar el tema reduce el torbellino mental.',
    ],
    tips: [
      'Baja el consumo de café y energizantes',
      'Separa 10 minutos al día para "planear preocupaciones" y luego ciérrala',
      'Si los ataques se repiten, busca ayuda profesional',
    ],
    guias: [
      { title: 'Cómo calmar un ataque de pánico', desc: 'Pasos concretos para cuando el cuerpo se dispara: agua fría, 4-7-8 y anclaje.' },
      { title: 'Respiración 4-7-8 paso a paso', desc: 'Inhala 4, sostén 7, exhala 8: la técnica más usada para dormir y calmar.' },
    ],
    ideas: [
      'Identificar mis disparadores de ansiedad',
      'Hacer 5 minutos de respiración cada mañana',
      'Dormir al menos 7 horas',
    ],
  },
  {
    id: 'familia',
    label: 'Problemas familiares',
    emoji: '✦',
    color: 'var(--accent-sage)',
    rgb: 'var(--accent-sage-rgb)',
    frases: [
      { text: 'No elegiste tu familia, pero sí puedes elegir tus límites y tu paz.', ref: 'Tus límites' },
      { text: 'Un hogar conflictivo no define tu valor: tú puedes construir tu propia calma, aunque vivas en medio del ruido.', ref: 'Propia calma' },
      { text: 'Las discusiones de los adultos casi nunca son contigo: son de ellos, contigo enfrente.', ref: 'Es de ellos' },
    ],
    retos: [
      {
        id: 'fam-1',
        emoji: '⇥',
        title: 'Un límite claro',
        sub: 'Di tu frase límite una vez y con calma, sin entrar al grito.',
        steps: [
          'Decide tu frase límite: "no sigo esta discusión con gritos"',
          'Dila una sola vez, con calma',
          'Retírate si la escalada continúa',
        ],
      },
      {
        id: 'fam-2',
        emoji: '◯',
        title: 'Espacio seguro',
        sub: 'Hazte 10 minutos de refugio: tu cuarto, un parque o tu app.',
        steps: [
          'Elige tu refugio de hoy',
          'Pide 10 minutos sin interrupciones',
          'Úsalos para respirar o escribir',
        ],
      },
      {
        id: 'fam-3',
        emoji: '✎',
        title: 'Lo que siento en casa',
        sub: 'Escríbelo aunque todavía no lo digas: es tu brújula.',
        steps: [
          'Anota cómo te sientes hoy en casa',
          'Escribe qué necesitas en este momento',
          'Guárdalo: lo leerás cuando toque decidir',
        ],
      },
      {
        id: 'fam-4',
        emoji: '♫',
        title: 'Sal del medio',
        sub: 'Las peleas de adultos casi nunca son tuyas: no participes.',
        steps: [
          'Si la discusión sube, aléjate del lugar',
          'Ponte audífonos o cambia de habitación',
          'Repítete: "es de ellos, no conmigo"',
        ],
      },
      {
        id: 'fam-5',
        emoji: '✆',
        title: 'Un adulto fuera de casa',
        sub: 'Amplía tu red: quien te escuche fuera del hogar también te cuida.',
        steps: [
          'Piensa en un adulto que te escuche',
          'Escríbele algo breve hoy',
          'Pregúntale cómo está su día: abre el canal',
        ],
      },
      {
        id: 'fam-6',
        emoji: '❂',
        title: 'Sin cargar culpas ajenas',
        sub: 'Hoy no asumes responsabilidades que no son tuyas.',
        steps: [
          'Nota si algo hizo que te sintieras culpable',
          'Pregúntate: ¿es realmente mi responsabilidad?',
          'Suelta lo que no es tuyo con una exhalación larga',
        ],
      },
      {
        id: 'fam-7',
        emoji: '◷',
        title: 'Propón un acuerdo pacífico',
        sub: 'Un tema pequeño, una regla sencilla de convivencia.',
        steps: [
          'Elige un tema pequeño (música, horarios, ruido)',
          'Propón una regla sencilla y clara',
          'Acepta que tal vez respondan mañana: ya diste el paso',
        ],
      },
    ],
    saber: [
      'Poner límites no es desamor: es protegerte para poder estar mejor con las personas que quieres.',
      'Las peleas constantes en casa generan "hipervigilancia": el cuerpo en alerta incluso cuando no hay peligro.',
      'Los conflictos entre adultos tienden a intensificarse si tú participas como mediador: salir del medio también te cuida.',
    ],
    tips: [
      'Ten un lugar seguro (tu cuarto, un parque, una app) para recargar',
      'No medies en las discusiones de tus padres',
      'Busca un adulto de confianza fuera de casa si el ambiente se vuelve pesado',
    ],
    guias: [
      { title: 'Cómo convivir con una familia conflictiva', desc: 'Estrategias de distancia emocional sana sin dejar de ser familia.' },
      { title: 'Límites saludables con tus padres', desc: 'Cómo decir "no" y marcar acuerdos sin culpa ni gritos.' },
    ],
    ideas: [
      'Definir mi espacio seguro en casa',
      'Tener 1 momento de paz diario sin interrupciones',
      'Hablar de mis límites con calma y sin culpa',
    ],
  },
  {
    id: 'economia',
    label: 'Problemas económicos',
    emoji: '✦',
    color: 'var(--accent-gold)',
    rgb: 'var(--accent-gold-rgb)',
    frases: [
      { text: 'Las dificultades de dinero no te hacen menos valioso: te están enseñando a administrar la vida.', ref: 'Aprender' },
      { text: 'Hoy no tienes que resolverlo todo: cada ahorro, por pequeño, es una victoria real.', ref: 'Cada peso cuenta' },
      { text: 'Tus problemas económicos de hoy no definen tu futuro: casi nadie termina donde empezó.', ref: 'Tu futuro' },
    ],
    retos: [
      {
        id: 'eco-1',
        emoji: '❋',
        title: 'Caza de gastos',
        sub: 'Revisa tu semana e identifica 1 gasto que puedes reducir hoy.',
        steps: [
          'Revisa tus últimos gastos',
          'Elige 1 que puedas recortar',
          'Anota cuánto ahorraste',
        ],
      },
      {
        id: 'eco-2',
        emoji: '❋',
        title: 'Idea de ingreso',
        sub: 'Escribe 1 idea realista para ahorrar o generar esta semana.',
        steps: [
          'Haz una lista de 3 habilidades que tienes',
          'Elige 1 idea concreta',
          'Anota el primer paso para esta semana',
        ],
      },
      {
        id: 'eco-3',
        emoji: '❝',
        title: 'Rompe el silencio',
        sub: 'Hablar del tema lo encoge: el silencio lo agranda.',
        steps: [
          'Elige a quién contárselo',
          'Cuenta 1 preocupación real',
          'Pide una opinión honesta',
        ],
      },
      {
        id: 'eco-4',
        emoji: '◈',
        title: 'Compra con escudo',
        sub: 'Una lista escrita es tu protección contra los impulsos.',
        steps: [
          'Escribe tu lista de compras antes de salir',
          'Antes de comprar algo extra, espera 24 horas',
          'Pregúntate: ¿necesidad o deseo? Hoy gana la necesidad',
        ],
      },
      {
        id: 'eco-5',
        emoji: '❏',
        title: 'Explora 1 beca o apoyo',
        sub: 'Hay programas gratuitos para jóvenes que aún no conoces.',
        steps: [
          'Busca 10 minutos becas o apoyos juveniles',
          'Anota 2 candidatas que encuentres',
          'Elige a cuál escribirás o aplicarás esta semana',
        ],
      },
      {
        id: 'eco-6',
        emoji: '✓',
        title: 'Gratitud financiera',
        sub: 'Cuenta lo que sí tienes: nadie termina donde empezó.',
        steps: [
          'Anota 3 recursos que ya tienes',
          'Reconoce 1 logro económico pequeño',
          'No compares tu ritmo con el de otros',
        ],
      },
      {
        id: 'eco-7',
        emoji: '✾',
        title: 'Semilla semanal',
        sub: 'Ahorra aunque sea mínimo: cada peso cuenta.',
        steps: [
          'Define un monto fijo para esta semana',
          'Guárdalo apenas lo recibas',
          'Lleva la cuenta de tu semilla',
        ],
      },
    ],
    saber: [
      'El estrés financiero activa las mismas respuestas del cuerpo que el peligro físico: por eso cansa tanto y afecta el ánimo.',
      'Existen becas y programas juveniles de emprendimiento gratuitos en casi todos los países: encontrar 1 esta semana es un primer paso.',
      'Las compras por impulso suben cuando hay estrés: el cerebro busca alivio inmediato. Una lista de compras es un escudo.',
    ],
    tips: [
      'Habla del tema con alguien de confianza: el silencio lo agranda',
      'Prioriza necesidades vs deseos esta semana',
      'No tomes decisiones financieras grandes en días de mucho estrés',
    ],
    guias: [
      { title: 'Economía para jóvenes sin morir en el intento', desc: 'Presupuesto simple, ahorro mínimo y cómo empezar a generar ingresos.' },
      { title: 'Becas y apoyos en tu país', desc: 'Dónde buscar programas gratuitos de estudio, empleo y emprendimiento juvenil.' },
    ],
    ideas: [
      'Llevar un registro de gastos básico',
      'Ahorrar una cantidad fija semanal (aunque sea mínima)',
      'Investigar 1 beca o programa de apoyo',
    ],
  },
  {
    id: 'amistades',
    label: 'Amistades tóxicas',
    emoji: '✦',
    color: 'var(--accent-lavender)',
    rgb: 'var(--accent-lavender-rgb)',
    frases: [
      { text: 'Una amistad no debería drenarte: los amigos se suman, no te restan.', ref: 'Se suman' },
      { text: 'Alejarte de quien te hace daño no es traición: es cuidado propio.', ref: 'Cuidado propio' },
      { text: 'Quien se enoja porque dices "no" no estaba siendo tu amigo: te estaba usando.', ref: 'Tu no vale' },
    ],
    retos: [
      {
        id: 'ami-1',
        emoji: '⌕',
        title: 'Autopsia social',
        sub: 'Anota 1 interacción de hoy que te dejó mal, y por qué.',
        steps: [
          'Recuerda una interacción reciente',
          'Anota qué sentiste y por qué',
          'Márcala: ¿me suma o me resta?',
        ],
      },
      {
        id: 'ami-2',
        emoji: '⊘',
        title: 'El no sin drama',
        sub: 'Di "no" a un plan que no quieres, sin dar mil explicaciones.',
        steps: [
          'Elige a quién dirás no',
          'Usa una frase corta: "hoy no puedo"',
          'No justifiques en exceso',
        ],
      },
      {
        id: 'ami-3',
        emoji: '❝',
        title: 'Mensaje a tu red',
        sub: 'Conecta hoy con alguien con quien te sientas valorado(a).',
        steps: [
          'Piensa en 1 persona que te sume',
          'Envíale un mensaje hoy',
          'Planea un plan breve con esa persona',
        ],
      },
      {
        id: 'ami-4',
        emoji: '⊘',
        title: 'Distancia suave',
        sub: 'Responde menos y programa menos: sin drama, sin explicaciones.',
        steps: [
          'Elige a quién bajarás contacto',
          'Deja sus mensajes para más tarde',
          'Da espacio sin dar explicaciones',
        ],
      },
      {
        id: 'ami-5',
        emoji: '◉',
        title: 'Detector de señales',
        sub: 'Identifica 1 señal de drenaje: burla, culpa o puro favor.',
        steps: [
          'Lee tus últimas conversaciones',
          'Identifica burlas, culpas o favores unidireccionales',
          'Anótala para tenerla presente',
        ],
      },
      {
        id: 'ami-6',
        emoji: '◎',
        title: 'Tu grupo nuevo',
        sub: 'Busca 1 actividad donde te valoren por quien eres.',
        steps: [
          'Elige una actividad (deporte, arte, club)',
          'Investiga dónde hay grupos',
          'Da el primer paso para unirte',
        ],
      },
      {
        id: 'ami-7',
        emoji: '✕',
        title: 'Secreto guardado',
        sub: 'Protege tu información íntima de quien ya te traicionó.',
        steps: [
          'Identifica qué secreto ya no compartirás',
          'Practica responder: "eso no es tema"',
          'Date crédito por cuidarte',
        ],
      },
    ],
    saber: [
      'La presión de grupo baja notablemente después de los 16-18 años: no será así para siempre.',
      'Un amigo de verdad celebra tus límites. Quien se molesta porque dices no, está interesado en lo que le das, no en ti.',
      'La "amistad" que solo aparece para pedir favores y desaparece en tus malos días no es amistad: es conveniencia.',
    ],
    tips: [
      'Distancia gradual sin drama: responde menos, programa menos planes',
      'Conecta con 1 actividad o grupo nuevo donde te valoren',
      'No compartas secretos íntimos con quien ya te traicionó',
    ],
    guias: [
      { title: 'Cómo reconocer una amistad tóxica', desc: 'Las señales de drenaje, control y burla que a veces confundimos con cariño.' },
      { title: 'Alejarte sin culpa y sin guerra', desc: 'La estrategia del distanciamiento suave cuando no quieres un drama explícito.' },
    ],
    ideas: [
      'Decir "no" sin culpa',
      'Buscar un grupo o actividad donde me valoran',
      'Reducir el contacto con quien me drena',
    ],
  },
  {
    id: 'noviazgo',
    label: 'Noviazgos tóxicos',
    emoji: '✦',
    color: 'var(--accent-rose)',
    rgb: 'var(--accent-rose-rgb)',
    frases: [
      { text: 'El amor no controla: acompaña. Si revisa tu teléfono y te aísla, eso no es amor.', ref: 'Eso no es amor' },
      { text: 'Tú no tienes que arreglar a nadie: una relación se construye, no se remedia.', ref: 'Construir' },
      { text: 'Mereces a alguien que sume a tu vida, no que te cargue con la suya.', ref: 'Mereces' },
    ],
    retos: [
      {
        id: 'nov-1',
        emoji: '◍',
        title: 'Espejo honesto',
        sub: 'Evalúa: ¿en esta relación eres más tú o menos tú?',
        steps: [
          'Pregúntate cómo te sientes en esa relación',
          'Compara cómo eres con tus amistades',
          'Anota 1 conclusión honesta',
        ],
      },
      {
        id: 'nov-2',
        emoji: '▶',
        title: 'Amigo consejero',
        sub: 'Si tu mejor amigo(a) estuviera en tu relación, ¿qué le diría?',
        steps: [
          'Imagina su situación como si fuera de tu mejor amigo(a)',
          'Escribe lo que le dirías',
          'Guarda ese consejo para ti',
        ],
      },
      {
        id: 'nov-3',
        emoji: '❝',
        title: 'Confidente',
        sub: 'Cuéntale a alguien de confianza cómo te trata tu pareja.',
        steps: [
          'Elige 1 persona de confianza',
          'Cuéntale algo real de la relación',
          'Escucha su perspectiva sin defenderla',
        ],
      },
      {
        id: 'nov-4',
        emoji: '⚠',
        title: 'Caza la bandera roja',
        sub: 'Identifica 1 señal de control o desgaste y nómbrala.',
        steps: [
          'Revisa: celos, control o aislamiento',
          'Anota 1 ejemplo concreto',
          'Pregúntate: ¿esto se repite?',
        ],
      },
      {
        id: 'nov-5',
        emoji: '⚑',
        title: 'Salida con red',
        sub: 'Si la relación duele, prepara tu salida acompañado(a).',
        steps: [
          'Anota por qué quieres salir',
          'Elige quién te acompañará en el proceso',
          'Define a dónde irías si necesitas espacio',
        ],
      },
      {
        id: 'nov-6',
        emoji: '≋',
        title: 'Reconoce el ciclo',
        sub: 'Discusión intensa, luego "luna de miel": eso no es un arreglo.',
        steps: [
          'Recuerda la última discusión',
          'Nota cómo le siguió un "todo lindo"',
          'Escribe: es un ciclo, no una solución',
        ],
      },
      {
        id: 'nov-7',
        emoji: '♥',
        title: 'Tu lista de merecimientos',
        sub: 'Escribe qué mereces y qué no aceptarás en una relación.',
        steps: [
          'Anota 5 cosas que sí mereces en una relación',
          'Anota 3 cosas que no aceptarás',
          'Guárdala y léela cuando dudes',
        ],
      },
    ],
    saber: [
      'Los celos constantes y el control del teléfono NO son señales de amor: son banderas rojas y rara vez cambian solos.',
      'Las relaciones sanas pelean y resuelven; las tóxicas castigan con silencio, amenazas o culpa.',
      'El ciclo "discusión intensa → luna de miel breve" es parte del desgaste emocional: no es que "se arregló", es que se repite.',
    ],
    tips: [
      'Confía en tus amigos cuando te avisan de banderas rojas',
      'No normalices gritos, faltas de respeto o la "humillación disfrazada de broma"',
      'Si hay miedo o agresión, la relación debe terminar: puedes pedir ayuda para salir',
    ],
    guias: [
      { title: 'Banderas rojas en el noviazgo', desc: 'Las 8 señales de control, desgaste y manipulación que debes conocer.' },
      { title: 'Cómo terminar una relación tóxica con apoyo', desc: 'Un plan paso a paso para salir acompañado(a) y sin volver a caer.' },
    ],
    ideas: [
      'Escribir qué merezco y qué no acepto en una relación',
      'Contar a alguien de confianza cómo me trata mi pareja',
      'Ponerme límites de tiempo y espacio en la relación',
    ],
  },
  {
    id: 'adicciones',
    label: 'Adicciones',
    emoji: '✦',
    color: 'var(--accent-warm)',
    rgb: 'var(--accent-warm-rgb)',
    frases: [
      { text: 'No eres tu consumo: eres la persona que está luchando por volver a sí misma.', ref: 'Vuelves a ti' },
      { text: 'Cada día sin recaer es una victoria, y cada recaída es información, no fracaso.', ref: 'Información' },
      { text: 'Pedir ayuda con una adicción no es debilidad: es la decisión más valiente del camino.', ref: 'Valentía' },
    ],
    retos: [
      {
        id: 'adi-1',
        emoji: '⌖',
        title: 'Detector de disparadores',
        sub: 'Anota hoy 1 disparador de tu consumo: lugar, hora o emoción.',
        steps: [
          'Recuerda cuándo sentiste ganas hoy',
          'Identifica lugar, hora, emoción o persona',
          'Anótalo sin juicio',
        ],
      },
      {
        id: 'adi-2',
        emoji: '↻',
        title: 'El reemplazo',
        sub: 'Cambia un momento de consumo por otra actividad: caminar o hablar.',
        steps: [
          'Elige el momento más tentador del día',
          'Prepara tu alternativa (caminar, dibujar, hablar)',
          'Ejecútala si el momento llega',
        ],
      },
      {
        id: 'adi-3',
        emoji: '✆',
        title: 'Verdad a alguien',
        sub: 'Cuéntale la verdad sobre tu consumo a una persona de confianza.',
        steps: [
          'Elige a quién le contarás',
          'Decide qué parte dirás hoy',
          'Hazlo en persona o por llamada',
        ],
      },
      {
        id: 'adi-4',
        emoji: '◷',
        title: 'El craving de 20 minutos',
        sub: 'El deseo dura en promedio 15-20 min: surfea la ola.',
        steps: [
          'Pon un temporizador de 20 minutos',
          'Haz una acción neutra mientras pasa (agua, ducha, pasear)',
          'Califica la urgencia antes y después: verás la bajada',
        ],
      },
      {
        id: 'adi-5',
        emoji: '⇥',
        title: 'Tu respuesta de escape',
        sub: 'Inventa tu frase para cuando te ofrezcan: "no, gracias".',
        steps: [
          'Crea tu frase: "no, gracias, cuido mi salud"',
          'Practícala en voz alta 3 veces',
          'Ténla lista para cualquier oferta',
        ],
      },
      {
        id: 'adi-6',
        emoji: '❐',
        title: 'Zona libre',
        sub: 'Define un lugar u hora sin consumo y protégela como prioridad.',
        steps: [
          'Define un espacio u hora donde no usarás',
          'Comunícala a alguien cercano',
          'Protégela como prioridad',
        ],
      },
      {
        id: 'adi-7',
        emoji: '❦',
        title: 'Busca tu red',
        sub: 'Encuentra 1 recurso de apoyo: centro, grupo o línea de ayuda.',
        steps: [
          'Busca 10 minutos grupos o líneas de apoyo',
          'Anota nombres y horarios',
          'Guarda el contacto en tu celular',
        ],
      },
    ],
    saber: [
      'El craving dura en promedio 15-20 minutos: si te distraes durante ese tiempo, la intensidad baja sola.',
      'Las adicciones no son falta de voluntad: son cambios en el sistema de recompensa del cerebro, y eso también se reentrena.',
      'Guardar "solo un poco" para después es la trampa más común: la abstinencia clara reduce el riesgo de recaída.',
    ],
    tips: [
      'Evita el contacto con personas y lugares ligados al consumo al inicio',
      'Inventa una "respuesta de escape" para cuando te ofrezcan: "no, gracias, cuido mi salud"',
      'Busca apoyo profesional o de grupos: recuperarte acompañado(a) multiplica tus chances',
    ],
    guias: [
      { title: 'Adicciones y juventud: entender para salir', desc: 'Cómo funciona el ciclo del consumo y qué estrategias reales funcionan para salir.' },
      { title: 'Recursos de apoyo contra las adicciones', desc: 'Centros, líneas y comunidades de Centroamérica donde pedir ayuda sin pena.' },
    ],
    ideas: [
      'Identificar mis disparadores de consumo',
      'Tener una respuesta lista para cuando me ofrezcan',
      'Buscar 1 recurso de apoyo esta semana',
    ],
  },
  {
    id: 'suicidio',
    label: 'Pensamientos de suicidio',
    emoji: '✦',
    color: 'var(--accent-rose)',
    rgb: 'var(--accent-rose-rgb)',
    frases: [
      { text: 'Lo que sientes ahora es una tormenta, y las tormentas no duran para siempre. No estás solo(a): quédate un día más.', ref: 'Quédate' },
      { text: 'Ese pensamiento no eres tú: es el dolor hablando con una voz muy alta. Busca ayuda ahora mismo.', ref: 'Ayuda ya' },
      { text: 'No tienes que sentirte fuerte hoy: solo tienes que no estar solo(a) hoy.', ref: 'Compañía' },
    ],
retos: [
      {
        id: 'sui-1',
        emoji: '✆',
        title: 'Guarda una línea de ayuda',
        sub: 'Si el pensamiento de hacerte daño aparece, hay a quién llamar.',
        steps: [
          'Abre el menú SOS de la app',
          'Guarda el número de crisis en tu celular',
          'Si el pensamiento es fuerte: llama AHORA',
        ],
      },
      {
        id: 'sui-2',
        emoji: '●',
        title: 'No estés solo(a) hoy',
        sub: 'El dolor se alivia con compañía real: avisa a alguien.',
        steps: [
          'Elige a una persona de confianza',
          'Cuéntale cómo te sientes hoy',
          'Quédate con ella o en llamada',
        ],
      },
      {
        id: 'sui-3',
        emoji: '‖',
        title: 'Pausa de 24 horas',
        sub: 'Pospón cualquier decisión: la crisis es una tormenta, no una verdad.',
        steps: [
          'Recuerda: la intensidad máxima es temporal',
          'Pospón cualquier decisión por 24 horas',
          'Pide apoyo profesional esta semana',
        ],
      },
      {
        id: 'sui-4',
        emoji: '✦',
        title: 'Zona segura',
        sub: 'Retira objetos con los que podrías hacerte daño: es protección real.',
        steps: [
          'Identifica cualquier objeto peligroso cerca de ti',
          'Retíralo o ponlo en manos de alguien de confianza',
          'Comunícalo: te protege y descomprime',
        ],
      },
      {
        id: 'sui-5',
        emoji: '✎',
        title: 'Plan de seguridad',
        sub: 'Escribe tu plan para cuando la crisis llegue.',
        steps: [
          'Anota tus señales de alerta',
          'Escribe 2 estrategias que te calman',
          'Anota 3 personas a quienes llamar y las líneas de ayuda',
        ],
      },
      {
        id: 'sui-6',
        emoji: '❦',
        title: 'Sesión de realidad',
        sub: 'El dolor habla con voz alta: hoy le respondes con hechos.',
        steps: [
          'Escribe lo que el dolor te grita',
          'Respóndele con hechos: cosas que ya superaste',
          'Guarda tu respuesta para cuando vuelva',
        ],
      },
      {
        id: 'sui-7',
        emoji: '◐',
        title: 'Una meta para mañana',
        sub: 'Define 1 cosa diminuta para mañana y avisa a alguien.',
        steps: [
          'Define 1 cosa simple para mañana (bañarte, comer algo, ver el sol)',
          'Avisa a alguien que la harás',
          'Cumple esa promesa contigo',
        ],
      },
    ],
    saber: [
      'La crisis suicida es temporal: la intensidad máxima dura minutos u horas y cede, aunque ahora no lo parezca.',
      'Hablar del suicidio no lo "provoca": preguntar y escuchar SIEMPRE ayuda y puede salvar una vida.',
      'El hecho de que estés leyendo esto buscando apoyo ya es una señal de que quieres estar bien: hay puertas abiertas.',
    ],
    tips: [
      'Usa ya el menú SOS, llama a una línea de crisis o al 911',
      'No te quedes solo(a): avisa a un adulto de confianza HOY',
      'Elimina objetos con los que podrías hacerte daño: es una medida real de protección',
    ],
    guias: [
      { title: 'Líneas de ayuda de Centroamérica', desc: 'Teléfonos gratuitos de crisis por país. Están para escucharte ahora.' },
      { title: 'Cómo pedir ayuda: qué decir y a quién', desc: 'Un guion para hablar con un adulto o profesional sin quedarte en el intento.' },
    ],
    ideas: [
      'Guardar el teléfono de una línea de ayuda en mi celular',
      'Avisar a una persona de confianza cómo me siento',
      'Buscar apoyo profesional esta semana',
    ],
  },
];

export const GENERAL: Lucha = {
  id: 'general',
  label: 'Bienestar general',
  emoji: '✦',
  color: 'var(--text-secondary)',
  rgb: 'var(--accent-sage-rgb)',
  frases: [
    { text: 'Respira profundo: cada exhalación es un permiso para soltar lo que no te sirve.', ref: 'Calma' },
    { text: 'No tienes que cargar todo hoy. Un paso a la vez también es avanzar.', ref: 'Paso a paso' },
    { text: 'Tus emociones son información, no definen quién eres.', ref: 'Emociones' },
    { text: 'Descansar no es rendirse: es reabastecer tu energía para seguir.', ref: 'Descanso' },
    { text: 'Hoy elige ser amable contigo: con tus mismos ojos, otras palabras.', ref: 'Amabilidad' },
  ],
  retos: [
    {
      id: 'gen-1',
      emoji: '≋',
      title: 'Pausa consciente',
      sub: '5 minutos sin pantallas, solo respirando.',
      steps: [
        'Apaga las notificaciones',
        'Siéntate cómodo con los pies en el suelo',
        'Respira lento durante 5 minutos',
      ],
    },
    {
      id: 'gen-2',
      emoji: '❏',
      title: 'Línea de desahogo',
      sub: 'Escribe 1 línea de lo que ronda tu cabeza y libérala.',
      steps: [
        'Escribe lo que ronda tu cabeza',
        'Léela y destrúcela si quieres',
        'Siente cómo baja el peso',
      ],
    },
    {
      id: 'gen-3',
      emoji: '✦',
      title: 'Estrella del día',
      sub: 'Identifica 1 cosa buena de hoy, aunque sea diminuta.',
      steps: [
        'Busca algo bueno del día',
        'Anótalo en el momento',
        'Compártelo con alguien',
      ],
    },
    {
      id: 'gen-4',
      emoji: '⇢',
      title: '10 minutos afuera',
      sub: 'Caminar al aire libre aclara los pensamientos.',
      steps: [
        'Sal 10 minutos al aire libre',
        'Camina sin teléfono',
        'Observa 3 detalles del entorno',
      ],
    },
    {
      id: 'gen-5',
      emoji: '✆',
      title: 'Nombra la emoción',
      sub: '"Esto es ansiedad": ponerle nombre le quita poder.',
      steps: [
        'Detecta 1 emoción fuerte de hoy',
        'Ponle su nombre preciso',
        'Dila en voz alta o escríbela',
      ],
    },
    {
      id: 'gen-6',
      emoji: '☾',
      title: 'Noche de recuperación',
      sub: 'Hora fija de dormir: tu mejor inversión de bienestar.',
      steps: [
        'Define tu hora de dormir',
        'Apaga pantallas 30 minutos antes',
        'Recuerda 1 logro del día antes de cerrar los ojos',
      ],
    },
    {
      id: 'gen-7',
      emoji: '✉',
      title: 'Amable contigo',
      sub: 'Hoy te tratas con el cariño que das a los demás.',
      steps: [
        'Elige 1 cosa indulgente (dormir más, baño largo, tu canción)',
        'Házte el favor sin culpa',
        'Al final del día, agradécete',
      ],
    },
  ],
  saber: [
    'Escribir lo que sientes por 2 minutos reduce la intensidad de la emoción: al nombrarla, tu cerebro la procesa mejor.',
    'El cerebro humano tiene un sesgo natural a lo negativo. Buscar 3 cosas buenas al día entrena un equilibrio real.',
    'Caminar 10 minutos al aire libre baja el cortisol y aclara los pensamientos.',
  ],
  tips: [
    'Tómate 5 minutos de pausa consciente hoy: sin pantallas, solo respirando',
    'Nombra una emoción fuerte que sientas: "esto es ansiedad" le quita poder',
    'Antes de dormir, recuerda una cosa que lograste, por pequeña que sea',
  ],
  guias: [
    { title: 'Primeros auxilios emocionales', desc: 'Respuestas rápidas para momentos de crisis: pánico, enojo y desborde.' },
    { title: 'Tu rutina de calma diaria', desc: 'Un esquema de 15 minutos al día para sostener tu bienestar.' },
  ],
  ideas: [
    'Hacer 5 minutos de respiración cada mañana',
    'Escribir una línea al día en mi bitácora',
    'Tener una rutina fija para dormir',
  ],
};

export const getLucha = (id: string): Lucha => LUCHAS.find((l) => l.id === id) ?? GENERAL;

// Relaciona los problemas elegidos en el onboarding con las luchas del marco
export const problemsToLucha = (problems?: string[]): string => {
  const join = (problems ?? []).join(' ').toLowerCase();
  if (/suicid|hacerme daño|dañarme|acabar con/.test(join)) return 'suicidio';
  if (/adicci|consumo|sustancia|vape|alcohol|drogas/.test(join)) return 'adicciones';
  if (/ansiedad|estrés|concentraci|pánico/.test(join)) return 'ansiedad';
  if (/tristeza|desánimo|negativos|depresi/.test(join)) return 'depresion';
  if (/familia|papás|casa|padres/.test(join)) return 'familia';
  if (/dinero|económic|trabajo|deuda/.test(join)) return 'economia';
  if (/noviazgo|pareja|amor|relación/.test(join)) return 'noviazgo';
  if (/soledad|aislamiento|amigos|amistad/.test(join)) return 'amistades';
  return 'general';
};

export const dayOfYear = (): number =>
  Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);