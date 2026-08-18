export interface Lucha {
  id: string;
  label: string;
  emoji: string;
  color: string;
  rgb: string;
  frases: { text: string; ref: string }[];
  retos: string[];
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
      'Escribe 3 cosas que sí lograste hoy, aunque parezcan mínimas.',
      'Habla con alguien de confianza de cómo te sientes (o escríbelo en tu bitácora).',
      'Sal a la luz del sol 10 minutos: sí, aunque no tengas ganas.',
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
      'Practica la respiración 4-7-8 durante 2 minutos hoy.',
      'Escribe tu peor escenario y luego 3 cosas que harías si pasara: pierde poder.',
      'Hoy evita el café y los energizantes: el cuerpo confunde "energía" con "peligro".',
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
      'Establece un límite claro hoy: "no sigo esta discusión con gritos".',
      'Escribe cómo te sientes en casa y qué necesitas, aunque todavía no lo digas.',
      'Hazte hoy 10 minutos de espacio seguro: tu cuarto, un parque o tu app.',
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
      'Revisa tu semana e identifica 1 gasto que puedes reducir hoy.',
      'Escribe 1 idea realista para ahorrar o generar ingreso esta semana.',
      'Habla con alguien de confianza sobre el tema: el silencio lo agranda.',
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
      'Anota hoy 1 interacción con amistades que te dejó mal, y por qué.',
      'Dile "no" a un plan que no quieres, sin dar mil explicaciones.',
      'Manda un mensaje a alguien con quien te sientas valorado(a).',
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
      'Evalúa hoy: ¿te sientes más tú o menos tú en esa relación?',
      'Hazte esta pregunta: si mi mejor amigo(a) estuviera en mi relación, ¿qué le diría?',
      'Cuéntale a alguien de confianza cómo te trata tu pareja (aunque duela decirlo).',
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
      'Hoy identifica 1 disparador de tu consumo (lugar, hora, emoción o persona) y anótalo.',
      'Remplaza un momento de consumo por otra actividad: caminar, dibujar o hablar.',
      'Cuéntale la verdad a una persona de confianza sobre tu consumo.',
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
      'Si tienes pensamientos de hacerte daño: llama ahora a una línea de ayuda (menú SOS).',
      'Cuéntale a alguien de confianza lo que estás sintiendo hoy.',
      'Pospón cualquier decisión por 24 horas y busca apoyo profesional esta semana.',
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
    'Haz la respiración 4-7-8 durante 2 minutos hoy.',
    'Escribe 1 línea de desahogo en tu bitácora y libérala.',
    'Identifica 1 cosa buena de hoy, aunque sea diminuta.',
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