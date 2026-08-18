/* ----------------------------------------------------
   ALIVIA - CONTENIDO DE LA BIBLIOTECA
   Guías cortas, directas y con tono juvenil.
   Cada guía: pasos + checklist + quiz + cierre.
   ---------------------------------------------------- */

export type GuideCategory =
  | 'depresion'
  | 'ansiedad'
  | 'familia'
  | 'economia'
  | 'amistades'
  | 'noviazgo'
  | 'adicciones'
  | 'suicidio'
  | 'bienestar';

export interface GuideQuiz {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface GuideBlock {
  kind: 'intro' | 'steps' | 'check' | 'quiz' | 'tip' | 'quote' | 'action' | 'close';
  emoji?: string;
  title?: string;
  text: string;
  items?: string[];
  quiz?: GuideQuiz;
  action?: { label: string; to: string };
}

export interface GuideContent {
  minutes: number;
  blocks: GuideBlock[];
}

export const GUIDE_MINUTES: Record<string, number> = {
  l1: 3, l2: 4, l3: 3, l4: 5, l5: 4, l6: 4, l7: 3, l8: 4, l9: 3, l10: 4,
  l11: 3, l12: 4, l13: 5, l14: 4, l15: 3, l16: 4, l17: 4, l18: 4, l19: 4, l20: 3,
  l21: 1, l22: 4,
};

const intro = (text: string): GuideBlock => ({ kind: 'intro', text });
const st = (emoji: string, title: string, text: string): GuideBlock => ({ kind: 'steps', emoji, title, text });
const chk = (items: string[]): GuideBlock => ({ kind: 'check', text: '', items });
const tip = (text: string): GuideBlock => ({ kind: 'tip', text });
const qt = (text: string, by: string): GuideBlock => ({ kind: 'quote', text, title: by });
const quiz = (q: string, options: string[], answer: number, why: string): GuideBlock => ({
  kind: 'quiz', text: q, quiz: { q, options, answer, why },
});
const act = (label: string, to: string): GuideBlock => ({ kind: 'action', text: '', action: { label, to } });
const end = (text: string): GuideBlock => ({ kind: 'close', text });

export const GUIDES: Record<string, GuideContent> = {
  /* ============ ANSIEDAD ============ */
  l1: {
    minutes: 3,
    blocks: [
      intro('La vida no te la amarga lo que pasa: te la amarga la película que te pones en la cabeza. '),
      st('✦', 'Detecta el "modo catástrofe"', 'Cuando sientas angustia, pregúntate: ¿estoy pensando en hechos reales o en lo que "podría pasar"? Eso solo te mata dos veces: primero en tu mente.'),
      st('✦', 'Separa el hecho de la interpretación', 'El hecho: "no me respondió el mensaje". Tu interpretación: "me odia". La interpretación no es un dato. Trátala como rumor.'),
      st('✦', 'Acota el drama a 10 minutos', 'Permítete preocuparte un bloque de 10 minutos al día. Fuera de él, si vuelve el pensamiento, dile: "te atiendo en mi hora de drama".'),
      chk(['Escribí un pensamiento feo y lo marqué como "interpretación, no hecho"', 'Separé el hecho real de la película mental al menos una vez hoy', 'Programé mi "hora de drama" de 10 minutos sin culpa']),
      quiz(
        'Tu amigo no responde en 3 horas. La opción más sana es...',
        ['Asumir que ya no quiere ser tu amigo', 'Recordar que hay 100 razones posibles y buscar datos antes de conclusiones', 'Enviarle 15 mensajes seguidos hasta que responda'],
        1,
        'Las personas no responden por mil motivos (clases, sueño, cargando el teléfono). Concluir lo peor sin datos es el motor de la angustia.'
      ),
      qt('Entre el estímulo y la respuesta hay un espacio. Ahí vive tu libertad.', 'Viktor Frankl'),
      act('Ir a Breathe y soltar 2 minutos', '/breathe'),
      end('Menos película, más evidencia. Tu cabeza es buena jefa de cine: toma el control del proyector. '),
    ],
  },

  l2: {
    minutes: 4,
    blocks: [
      intro('Tu mente no necesita una semana de spa: necesita 18 minutos bien usados al día. '),
      st('✦', '3 minutos al despertar', 'Antes de agarrar el teléfono, respira 3 veces lento y decide UNA cosa que te hace bien hoy. Sin lista, sin presión.'),
      st('✦', '1 minuto por hora (regla del pulgar)', 'Cada hora, párate, mira lejos 20 segundos y nombra en tu cabeza 3 cosas que ves. Devuelve la mente al cuerpo.'),
      st('✦', '5 minutos antes de dormir', 'Cierra el día sin pantallas: escribe o recuerda 2 cosas que salieron bien. El cerebro dormirá con broche de oro.'),
      chk(['Empecé el día con una respiración y un objetivo simple', 'Hice mi "minuto del pulgar" en al menos 3 momentos', 'Apagué pantallas y cerré el día con 2 cosas buenas']),
      quiz(
        '¿Cuál es el mejor momento para dedicarte esos 18 minutos?',
        ['Solo cuando me acuerde', 'El mismo rato cada día, como un mini ritual', 'Nunca: no tengo tiempo'],
        1,
        'El ritual ancla la rutina. El cerebro no espera "cuando me acuerde": espera la hora fija.'
      ),
      tip('El objetivo no es ser perfecto: es que tu mente sepa que queda espacio reservado solo para ti.'),
      act('Hacer el ritual de Breathe', '/breathe'),
      end('18 minutos no cambian tu vida: cambian la forma en que la vives. '),
    ],
  },

  l3: {
    minutes: 3,
    blocks: [
      intro('La tristeza no es tu enemiga: es tu alarma. Y la depresión no es tristeza "con letras grandes": son cosas distintas. '),
      st('✦', 'La tristeza pasa por olas', 'La tristeza normal llega por algo concreto, tiene una ola y baja. La depresión es un mar gris sin motivo claro que no baja por sí solo.'),
      st('✦', 'Pregúntale a tu tristeza', '¿Qué me está diciendo esta tristeza? ¿Qué necesita mi vida que no está teniendo? La tristeza es información, no error del sistema.'),
      st('✦', 'Mide el tiempo y la intensidad', 'Si llevas más de 2 semanas hundido, sin energía, sin apetito o con pensamientos oscuros, eso ya no es "estar triste": eso es una señal para pedir ayuda.'),
      chk(['Escribí qué me está diciendo mi tristeza hoy', 'Identifiqué si mi ánimo viene de algo concreto o de un bajón sin causa', 'Me prometí que, si dura +2 semanas, hablaré con un adulto o profesional']),
      quiz(
        '¿Cuál de estas frases es la que la depresión "dice" de verdad?',
        ['Vamos a llorar una peli triste y listo', 'No tienes energía, no vales nada y no se te ocurra pedir ayuda', 'La tristeza es para siempre y es culpa tuya'],
        2,
        'Cuidado: la opción 3 parece dramática, pero es el guion clásico de la depresión. Opción 2 es su tono. La 1 es una tristeza normal: olas, no mar.'
      ),
      qt('Llorar no te hace débil: te hace humano. Pedir ayuda no te hace débil: te hace despierto.', 'ALIVIA'),
      act('Contármelo al radar emocional', '/radar'),
      end('Siente tu tristeza, escúchala y déjala ir. Y si el mar no baja: no lo cruces solo. '),
    ],
  },

  l4: {
    minutes: 5,
    blocks: [
      intro('Cuando el cuerpo se dispara (pánico, enojo, ganas de rendirte), no necesitas razones: necesitas protocolo. '),
      st('✦', 'Enfría el sistema', 'Agua fría en cara y muñecas, o un hielo en la mano. El frío es el botón de "apagado de emergencia" físico que el cerebro no puede ignorar.'),
      st('✦', 'Respira 4-7-8', 'Inhala 4 segundos, sostén 7, exhala 8. Repite 4 veces. La exhalación larga es una instrucción directa al cuerpo: "baja las revoluciones".'),
      st('✦', 'Aterriza con 5-4-3-2-1', '5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles, 1 que saboreas. Devuelve tu mente al presente real, donde ningún monstruo existe.'),
      st('✦', 'Enojado o en pánico: no decidas nada', 'Prométete: "ninguna decisión grande, ningún mensaje grave, antes de 24 horas". El cerebro caliente firma lo que la razón llora.'),
      chk(['Hice un enfriamiento físico (agua o hielo) ✔', 'Hice al menos 4 rondas de 4-7-8', 'Apliqué 5-4-3-2-1 y volví al presente']),
      quiz(
        '¿Para qué sirve la exhalación larga (8 segundos)?',
        ['Para cansar los pulmones', 'Para activar el sistema nervioso parasimpático: bajar las revoluciones', 'Es solo para dormir'],
        1,
        'La exhalación lenta enciende el freno del cuerpo. Por eso nadie puede hacerla bien y seguir en pánico al mismo tiempo.'
      ),
      qt('El pánico es la mente saliendo del cuerpo. El anclaje 5-4-3-2-1 la trae de vuelta.', 'ALIVIA'),
      act('Practicar 4-7-8 en Breathe', '/breathe'),
      end('Márcate esta guía como favorita: es la que usas cuando el cuerpo no escucha razones. '),
    ],
  },

  l5: {
    minutes: 4,
    blocks: [
      intro('Ser tímido no es un defecto: es tu algoritmo de fábrica. Y se puede actualizar sin dejar de ser tú. '),
      st('✦', 'Meta de micro-contacto', 'Hoy no vas a "hacer amigos". Vas a saludar a 1 persona nueva con nombre y una pregunta fácil: "¿qué materia te va bien?". Eso es todo.'),
      st('✦', 'Las preguntas son tus alas', 'La gente ama hablar de sí misma. Ten 3 preguntas listas ("¿qué hiciste este finde?", "¿qué música andas?"). Preguntar te deja brillar sin guion.'),
      st('✦', 'Practica el 20%', 'No necesitas ser el alma de la fiesta: necesitas llegar un 20% más lejos que tu zona cómoda. Saludar, preguntar, mantener 30 segundos. Repetir.'),
      chk(['Saludé a alguien nuevo con nombre y una pregunta', 'Usé una de mis 3 preguntas preparadas', 'Aguanté 30 segundos de conversación sin escapar']),
      quiz(
        'Eres tímido y hay un grupo conversando. La opción más realista...',
        ['Esperar a que alguien "me descubra"', 'Acercarme y preguntar algo simple sobre lo que hablan', 'Ignorarlos y seguir solo'],
        1,
        '"Ser descubierto" es fantasía de película: la amistad se construye con acercamientos pequeños y repetidos.'
      ),
      tip('El silencio incómodo lo sientes tú... y también el otro. Romperlo con una pregunta es un regalo para ambos.'),
      act('Contar cómo me fue en el Radar', '/radar'),
      end('No necesitas otra personalidad: necesitas más atrevimiento amable. '),
    ],
  },

  l6: {
    minutes: 4,
    blocks: [
      intro('No puedes elegir a tu familia, pero sí el lugar donde te paras dentro de ella. '),
      st('✦', 'Tres círculos', 'Dibuja mentalmente: lo que depende de ti, lo que depende de ellos, y lo que no depende de nadie. Solo ocúpate de tu círculo. El resto: obsérvalo desde lejos.'),
      st('✦', 'Menos pelea, más distancia amable', 'Cada pelea te drena. Aprende a retirarte antes del incendio: "está bien, hablamos cuando baje la temperatura". Retirarse no es rendirse: es protegerte.'),
      st('✦', 'Haz tu mini-mundo', 'Espacio, horario y círculo de amigos que SI puedes elegir. Un rincón propio donde el ambiente de casa no entre: es tu alma de reserva.'),
      chk(['Identifiqué mis 3 círculos y a qué me toca ocuparme', 'Usé la retirada amable en una discusión', 'Hice algo que fortalece mi mini-mundo (mi espacio o mis amigos)']),
      quiz(
        'Tu familia está peleando fuerte y te invitan a la pugna. Lo más sano...',
        ['Entrar a defender a alguien', 'Decir "no voy a meterme en esta pelea" y alejarte', 'Unirte al bando de los más ruidosos'],
        1,
        'Entrar a la pugna familiar suele ser pagar un impuesto emocional sin voto. La distancia amable LOS protege de ti y te protege a ti.'
      ),
      qt('La familia no define tu valor: define tus desafíos. Tú defines tus límites.', 'ALIVIA'),
      act('Soltar el tema en Coping', '/coping'),
      end('No puedes cambiar el ambiente si no te cambias de posición dentro de él. '),
    ],
  },

  l7: {
    minutes: 3,
    blocks: [
      intro('Dormir no es "perder tiempo": es el mantenimiento nocturno donde se arregla tu cerebro. '),
      st('✦', 'Entrena al reloj', 'Acuéstate y levántate a la misma hora 7 días: sí, también el finde. Tu reloj se funda si lo cambias cada dos días.'),
      st('✦', 'Kilómetro sin pantalla', 'Hora y media antes de dormir: adiós reels y TikTok. La luz azul le dice a tu cerebro "es de día, lucha". Lee, escríbete o solo respira.'),
      st('✦', 'La técnica del "renombrado"', 'Si te desvelas, no pienses "no puedo dormir" (pánico). Piensa "estoy descansando, mi cuerpo sabe". Y usa protocolo 4-7-8 si el cuerpo se acelera.'),
      chk(['Apagué pantallas al menos 60 min antes de dormir', 'Mantuve mi hora de acostarme parecida a la de ayer', 'Usé 4-7-8 cuando tardé en dormir']),
      quiz(
        '¿Por qué la luz azul de las pantallas arruina el sueño?',
        ['Porque cansa la vista', 'Porque engaña al cerebro diciendo que es de día y bloquea la melatonina', 'Porque hace ruido'],
        1,
        'La melatonina (la hormona del sueño) solo se libera en oscuridad real. Pantalla = mediodía falso.'
      ),
      tip('Cama = dormir. Si no duermes en 20 min, levántate, ve a otro lado, haz algo aburrido y vuelve. Entrena la asociación.'),
      end('Dormir bien es el 50% de tu salud emocional en el menú del día. '),
    ],
  },

  l8: {
    minutes: 4,
    blocks: [
      intro('Pedir ayuda no es molestar: es darle al otro la oportunidad de ser importante para ti. '),
      st('✦', 'Elige a tu persona', 'Alguien seguro: que escucha de verdad, no te interrumpe y no hace chistes de tu dolor. Una sola persona basta para empezar.'),
      st('✦', 'Abre con guion', 'Di: "necesito hablar y no quiero consejos aún: sí quiero que me escuches". Eso deja claro el contrato y baja la presión.'),
      st('✦', 'Habla por ti, no por ellos', 'Frases con "yo": "yo me he sentido solo", "yo llevo semanas cansado". No "es que ustedes...". Sin acusar, el otro no se cierra.'),
      st('✦', 'Marca la siguiente cita', 'Cerrar con "¿podemos retomar esto el jueves?" hace que el proceso no termine en una sola charla.'),
      chk(['Elegí a mi persona segura mentalmente', 'Usé la frase de apertura con "quiero que me escuches"', 'Hablé con "yo" sin acusar']),
      quiz(
        'Tu amigo solo quiere darte consejos y tú solo querías ser escuchado. ¿Qué haces?',
        ['Me callo', 'Le digo: "hoy no necesito soluciones, solo que me escuches"', 'Me enojo y dejo de hablarle'],
        1,
        'Ajustar el contrato es legítimo. Mucha gente ama resolver: solo tienes que avisarles de qué necesitas hoy.'
      ),
      qt('Si pudiera salvar a alguien de una sola cosa, sería de lidiar con todo en silencio.', 'desconocido'),
      act('Registrar cómo me siento en el Radar', '/radar'),
      end('Cada vez que pides ayuda, le haces un favor a todos los que están callados. '),
    ],
  },

  l9: {
    minutes: 3,
    blocks: [
      intro('Tu ánimo no es un rumor: es un dato. Lleva la cuenta y verás patrones donde solo veías caos. '),
      st('✦', 'Registra sin juicio', 'Cada día un número (1-10) y una palabra. No hace falta redactar un diario: basta tu estado y el "porqué" en una línea.'),
      st('✦', 'Busca tus patrones', 'Tras una semana: ¿los lunes bajan? ¿después de redes? ¿con hambre? Tu ánimo tiene causas fijas: encontrarlas es poder sobre ellas.'),
      st('✦', 'Detecta tus disparadores', 'Si ves que te desplomas después de X o Y, ya no te tomas por sorpresa: preparas defensa (guía l4: protocolo).'),
      chk(['Registré mi ánimo de hoy con número y palabra', 'Miré mi semana y noté al menos 1 patrón', 'Identifiqué un disparador repetido']),
      quiz(
        '¿Para qué sirve detectar tu patrón de ánimo?',
        ['Para diagnosticarte', 'Para anticipar bajones y preparar defensa antes de que lleguen', 'Para googlear síntomas'],
        1,
        'Conocer tu mapa no te da la cura: te da la ventaja de no caer por sorpresa. Y ese es el primer paso del control.'
      ),
      act('Registrar el día de hoy', '/radar'),
      end('Lo que se mide se puede navegar. '),
    ],
  },

  l10: {
    minutes: 4,
    blocks: [
      intro('El estrés académico no es "no dar para más": es pedirte todo a la vez. La solución es secuenciar. '),
      st('✦', 'No hagas "todo": haz el siguiente bloque', 'Tu única meta ahora: 25 minutos del tema más pesado. Cuando termines, decides el próximo bloque. La escalera se sube un peldaño a la vez.'),
      st('✦', 'Pomodoro 25/5', '25 minutos encendido, 5 de descanso real (sin pantalla). Repetir. El cerebro rinde más en sprints que en maratones de agonía.'),
      st('✦', 'Evidencia > confianza', 'Antes de cada examen, haz 1 prueba o repaso en voz alta. Si puedes explicarlo, no "te la juegas": ya sabes.'),
      st('✦', 'Divide el miedo', 'Escribe TODO lo pendiente en un papel. Lo que está fuera de tu cabeza ya no te persigue: ahora es solo lista.'),
      chk(['Hice un bloque de 25 min del tema más pesado', 'Usé el formato 25/5 con descanso sin pantalla', 'Saqué lo pendiente de mi cabeza a un papel']),
      quiz(
        'Son las 11 pm y tienes 4 trabajos. ¿Qué hace tu versión inteligente?',
        ['Ponerme los 4 uno tras otro hasta las 4 am', 'Elegir UNO, hacerlo bien con sprints, y dormir; mañana sigo', 'Dejarlo todo y culparme'],
        1,
        'Estudiar con sueño rinde casi nada. Un trabajo brillante + sueño vence a cuatro trabajos a medias + agotamiento.'
      ),
      tip('Dormir la noche antes del examen es estudiar: es cuando el cerebro archiva lo aprendido.'),
      act('Soltar el estrés en Coping', '/coping'),
      end('El examen mide tu proceso, no tu valor. Y tu proceso mejora un peldaño a la vez. '),
    ],
  },

  /* ============ AMISTADES ============ */
  l11: {
    minutes: 3,
    blocks: [
      intro('Hay amigos que te recargan y amigos que te cobran con intereses. Aprende la factura. '),
      st('✦', 'Las 8 señales', '1) solo te buscan para pedir 2) te "chanchan" y si te molestas eres "sensible" 3) controlan tu tiempo 4) se burlan "es broma" 5) te copian para taparte 6) te aíslan del resto 7) tus logros los ven raros 8) te sientes vacío después de verlos.'),
      st('✦', 'Drenadora ≠ enemiga', 'No tienes que "declarar la guerra": puedes marcar distancia gradual. Menos reuniones, menos intimidad, más planes tuyos.'),
      st('✦', 'El test de la energía', 'Después de estar con alguien: ¿me da recarga o me da resaca? Diez minutos de honestidad valen más que años de "es que es mi amigo".'),
      chk(['Identifiqué al menos 2 señales de la lista', 'Apliqué distancia gradual sin drama', 'Hice el test de la energía con mi círculo']),
      quiz(
        'Tu "amigo" se burla de ti y dice "es broma, ¿ya no aguantas nada?". La realidad...',
        ['Es niño, se lo permite', 'Que la broma te duela es información: una amistad sana se ajusta cuando avisas', 'Soy un exagerado, debo callarme'],
        1,
        'El chiste duele = la cuenta está cobrando. Un buen amigo recibe tu aviso y ajusta. Quien te vuelve "sensible" por quejarte, te está entrenando a callar.'
      ),
      qt('Tú eres la media de las cinco personas con las que más tiempo pasas.', 'Jim Rohn'),
      act('Reflexionar y escribir en el Radar', '/radar'),
      end('Dejar espacio no es soledad: es hacerle hueco a amistades que sí suman. '),
    ],
  },

  l12: {
    minutes: 4,
    blocks: [
      intro('El amor no controla: acompaña. Y hay patrones que no son "amor intenso": son señales de alarma. '),
      st('✦', 'Las que nunca son amor', 'Celos que revisan tu teléfono, "no hables con ese porque me da inseguridad", aislarte de amigos/familia, exigir ubicación siempre, enojarse cuando dices no.'),
      st('✦', 'La duda que te avisa', 'Si sientes que caminas sobre huevos, que te explicas todo el tiempo o que "eres difícil de querer": eso no es amor, es un contrato desigual.'),
      st('✦', 'Dilo una vez, claramente', 'Pon tu límite con nombre: "no me escribas cuando me enoje", "no reviso más mi teléfono para ti". Si se repite, no es accidente: es decisión.'),
      st('✦', 'Salir es un acto de amor propio', 'Salir de una relación con banderas rojas no es fracaso: es terminar el curso a tiempo.'),
      chk(['Identifiqué al menos 1 bandera roja en mi historia', 'Puse un límite con nombre y cara', 'Reconocí que salir también puede ser ganar']),
      quiz(
        'Tu pareja revisa tu teléfono "porque te quiere". Eso es...',
        ['Prueba de amor', 'Control disfrazado de cariño: una relación sana no necesita vigilancia', 'Algo normal en todos los noviazgos'],
        1,
        'La confianza no se construye con lupa: se construye con palabra cumplida. La vigilancia es la declaración de que no hay confianza.'
      ),
      qt('Cuando te dicen "te quiero" mientras te cortan las alas, lo que cortan no es tu vuelo: es tu aviso.', 'ALIVIA'),
      act('Leer sobre cómo pedir ayuda', '/library/l8'),
      end('Amor no es quien te persigue: es quien te deja ser y se queda igual. '),
    ],
  },

  l13: {
    minutes: 5,
    blocks: [
      intro('Terminar una relación tóxica no se "decide": se planifica. Aquí tienes el plan paso a paso. '),
      st('✦', 'La operación, en secreto', 'No avises. Guarda lo tuyo: papeles, cuentas, redes, llaves, dineros. La salida se prepara como mudanza: cosas primero, discursos después.'),
      st('✦', 'Una red, no una isla', 'Confía el plan a 1-2 personas reales (familia, amigo, terapeuta). Personas que sepan dónde estás, qué pasos das y te traduzcan la culpa cuando llegue.'),
      st('✦', 'Cortes limpios', 'Bloqueo total: redes, número, amigos comunes (los que "te informan"). El algoritmo del cerebro necesita NO ver el vapor de la venganza para sanar.'),
      st('✦', 'Planea la emboscada emocional', 'A los 3-7 días te va a morir la tentación de volver. Ya lo sabes. Por eso tienes la lista (ver checklist) y personas que te la leen.'),
      chk(['Guardé y separé todo lo material en silencio', 'Confié mi plan a 1-2 personas reales', 'Bloqueé el contacto directo y el "puente informativo"']),
      quiz(
        'A la semana de terminar, sientes un vacío terrible y ganas de volver. Eso significa...',
        ['Que cometiste el peor error', 'Que tu cerebro pide la dosis conocida: abstinencia. Es química, no verdad', 'Que debes volver aunque fuera tóxico'],
        1,
        'El cerebro se engancha a lo conocido, aunque duela. La abstinencia no es amor: es química pasando factura. Espera 30 días antes de any decisión.'
      ),
      qt('La razón por la que no debes volver ya está escrita: está en tu checklist, cuando tu cabeza estaba fría.', 'ALIVIA'),
      act('Registrar mi día en el Radar', '/radar'),
      end('Sana el corazón con tiempo, no con regreso. El que se fue con plan, no vuelve por vapor. '),
    ],
  },

  /* ============ ECONOMÍA ============ */
  l14: {
    minutes: 4,
    blocks: [
      intro('No necesitas "ponerte en forma financiera": necesitas 3 reglas tontas que se cumplan solas. '),
      st('✦', 'Págate primero', 'El día que te entra dinero, saca aunque sea 10% a un lado aparte. No "lo que sobra": eso nunca sobra. Primero tú, luego el mundo.'),
      st('✦', 'La regla de los 3 tarros', 'Gasto (80%), ahorro (10%), felicidad/emergencia (10%). Tres bolsas mentales evitan la culpa y el descontrol.'),
      st('✦', 'La noche de gracia (24h)', 'Compras de más de X (pon tu precio, ej. $10): espera 24h. El impulso muere y el bolsillo vive.'),
      chk(['Aparté mi 10% de hoy para mí', 'Organizé mis 3 tarros (gasto/ahorro/felicidad)', 'Apliqué la noche de gracia a una compra impulso']),
      quiz(
        'La fórmula sana para tu plata es...',
        ['Gastar todo rápido porque la vida es una', 'Un sistema simple: págate a ti después de cobrar, ten tarros y espera 24h en compras grandes', 'Guardar todo y nunca disfrutar'],
        1,
        'El equilibrio mata la culpa: el tarro "felicidad" existe para que no sabotear el ahorro. Los sistemas simples se mantienen; los ideales, no.'
      ),
      tip('Las apps de préstamo exprés son deudas con patas de araña: hacen crecer la cifra sola. Huir del interés es ganar plata.'),
      act('Ver los apoyos que existen', '/library/l15'),
      end('Tu futuro financiero no se decide en los grandes salarios: en los pequeños repartos. '),
    ],
  },

  l15: {
    minutes: 3,
    blocks: [
      intro('Hay plata "regalada" esperando jóvenes que sepan dónde pedir. Tu trabajo: conocer el mapa. '),
      st('✦', 'Becas y programas', 'Ministerios de Educación, universidades públicas y ONG (ej. en CA: becas de presidencia, programas de jóvenes). Busca "becas + tu país + jóvenes". No existe una sola web: existen varias.'),
      st('✦', 'Primer empleo formal', 'Regístrate en bolsas oficiales de empleo de tu país (el Estado publica vacantes para jóvenes sin experiencia). El primer trabajo no es "poco": es tu carné de entrada.'),
      st('✦', 'Ocupa las ferias y charlas gratis', 'Universidades y fundaciones dan talleres gratis de CV, emprendimiento e inglés. Asistir = capital gratis.'),
      chk(['Busqué "becas + mi país + jóvenes" y guardé 2 resultados', 'Averigüé si estoy registrado/a en la bolsa oficial de empleo', 'Apunté un taller o feria gratuita de este mes']),
      quiz(
        '¿Cuál es el mejor momento para aplicar a una beca?',
        ['Cuando todo sea perfecto', 'Ahora, con lo que tengo: las becas se entregan a quienes aplican', 'El próximo ciclo, sin apuro'],
        1,
        'El "cape de perfección" es el asesino de oportunidades. Los requisitos se cumplen aplicando y preguntando, no esperando.'
      ),
      tip('La vergüenza de preguntar cuesta más cara que la pregunta en sí. Pregunta todo lo legal y gratis.'),
      end('La plata no cae del cielo: cae de los formularios. Llena uno esta semana. '),
    ],
  },

  /* ============ FAMILIA ============ */
  l16: {
    minutes: 4,
    blocks: [
      intro('No puedes mudarte todavía, pero sí puedes "apagar el ruido" dentro de tu propia casa. '),
      st('✦', 'Hipervigilancia, apágalo', 'Si en tu casa hay gritos o tensión, tu cuerpo se queda en "alerta de incendio". Entrena pausas: aunque suene feo, tú respira lento y baja el volumen interno.'),
      st('✦', 'No eres el árbitro', 'Los líos de ellos no son tuyos. No medies, no traduzcas, no salves. Tu única misión: conservar tu energía para tu vida.'),
      st('✦', 'Tu burbuja portable', 'Audífonos, canción, libro, rincón. Ritual de entrada/salida: "yo entro a MI espacio, no a SU conflicto".'),
      st('✦', 'Plan de salida 1.0', 'Aunque sea en un año: un plan silencioso (estudio, trabajo, beca) te da esperanza con hormigón. Papel y lápiz: ¿qué puedo construir fuera de casa?'),
      chk(['Salí mentalmente de una pelea que no era mía', 'Usé mi burbuja (canción/rincón) durante el ruido', 'Escribí 1 línea de mi plan de salida 1.0']),
      quiz(
        'Hay discusión violenta en casa y te sientes parte. ¿Qué hace tu versión que se cuida?',
        ['Entrar a gritar con ellos', 'Retirarme, respirar y recordar que su conflicto no es mi culpa ni mi trabajo', 'Quedarme escuchándolos toda la noche'],
        1,
        'Modo "no soy el árbitro": los líos son de los adultos. Meterse solo te drena y no arregla nada. Si hay peligro físico, SÍ: busca a un adulto de confianza o el 911.'
      ),
      qt('Tú no eliges dónde naces: eliges con qué te quedas. Tu casa puede ser tu cielo o tu escuela de supervivencia.', 'ALIVIA'),
      act('Ver las líneas de ayuda de mi país', '/sos'),
      end('El ambiente no te protege ni te detiene: tú te sabes construir tu clima. '),
    ],
  },

  /* ============ DEPRESIÓN ============ */
  l17: {
    minutes: 4,
    blocks: [
      intro('La depresión no es tristeza: es un bajón químico que roba energía, sueño, apetito y esperanza. Y se trata. '),
      st('✦', 'Es biología, no carácter', 'La depresión baja la serotonina/dopamina del cerebro: no eres "flojo" ni "dramático". Es como la fiebre: no se quita con "échale ganas".'),
      st('✦', 'Los síntomas reales', 'Dormir de más o de menos, comer de más o de menos, irritabilidad, llanto fácil, vacío, y esa niebla que hace lento todo. Si llevas 2+ semanas: señal.'),
      st('✦', 'El tratamiento funciona', 'Terapia + (a veces) medicación = el combo que más funciona. No es "para locos": es para gente que quiere su vida de vuelta.'),
      chk(['Identifiqué mis síntomas sin juzgarme', 'Le conté a un adulto o amigo que llevo +2 semanas con estos síntomas', 'Investigué al menos 1 lugar donde atienden gratis cerca de mí']),
      quiz(
        'Un amigo te dice "es que estás así porque piensas negativo, ¡póntela positiva!". La verdad técnica...',
        ['Tiene razón, soy flojo', 'La depresión no se revierte con pensamiento positivo forzado: necesita ayuda profesional, y eso es valentía', 'Debo esconder lo que siento'],
        1,
        'El "ponte positivo" a alguien con depresión es como decirle "respira" a alguien con asma. La depresión es una condición de salud, no una actitud.'
      ),
      qt('La depresión miente cuando dice que no tiene salida. Es un túnel, no una cueva sellada.', 'ALIVIA'),
      act('Ver cómo pedir ayuda (guion)', '/library/l22'),
      end('Si te reconoces aquí: no es tu carácter, es tu química. Y la química se trata. '),
    ],
  },

  l18: {
    minutes: 4,
    blocks: [
      intro('Ataque de pánico = el cuerpo gritando "¡PELIGRO!" cuando no hay león. Es horrible, no es peligroso, y se acaba. '),
      st('✦', 'Primera regla: no pelees', 'Tratar de "pararlo a la fuerza" lo hace peor. Quédate, no huyas, y recuerda: aunque se sienta como 10 minutos brutales, pasa. Siempre pasa.'),
      st('✦', 'Exhala antes que la ola', 'Inhala 4, exhala 8 (no sostengas: la exhalación larga es tu llave). La hiperventilación es el motor del miedo: exhalar lo desactiva.'),
      st('✦', 'Anclaje de tierra', '5-4-3-2-1 (ves/tocas/oyes/hueles/saboreas) en voz alta si puedes. Tu cerebro no puede inventar miedo y contar objetos a la vez.'),
      st('✦', 'Reduce la semana después', 'Menos café, menos redes, más agua y sueño. Un pánico fuerte deja el sistema "alborotado": la semana siguiente hay que cuidar la central eléctrica.'),
      chk(['Dejé de pelear con mi pánico y lo nombre', 'Apliqué la exhalación larga (4-8)', 'Hice 5-4-3-2-1 hasta que bajó la marea']),
      quiz(
        '¿Qué hace la exhalación larga durante un ataque?',
        ['Nada', 'Activae el freno (parasimpático): bajar el ritmo del corazón', 'Trae más aire y empeora'],
        1,
        'La hiperventilación te agita: la exhalación lenta es la instrucción física opuesta. Por eso 4-8 manda "baja" al cuerpo.'
      ),
      qt('Un ataque de pánico no te matará ni lo hará "para siempre": es una tormenta pasajera, no un huracán permanente.', 'ALIVIA'),
      act('Practicar mi protocolo ahora', '/breathe'),
      end('Pánico: horrible, inocuo, pasajero. Con protocolo, hasta los atacas de vuelta. '),
    ],
  },

  /* ============ ADICCIONES ============ */
  l19: {
    minutes: 4,
    blocks: [
      intro('Nadie "elige" una adicción: el cerebro engancha con dopamina antes de que la razón vote. Pero se sale. La ciencia lo dice. '),
      st('✦', 'Ciclo del enganche', 'Disparador → uso → alivio → culpa. La culpa es la feria del ciclo: de ella nace la próxima dosis. Cortar la culpa corta el ciclo.'),
      st('✦', 'La regla del hueco', 'La adicción no da placer: cubre un hueco que tienes abajo (miedo, soledad, estrés). Si solo tapas el hueco, vuelve. El trabajo grande es el fondo.'),
      st('✦', 'No se sale en secreto', 'La sobriedad tiene red: comunidad, familia escogida, grupos, terapeuta. Llevar solo la lucha duplica el riesgo: nadie gana una adicción en un salón a solas.'),
      chk(['Identifiqué mi ciclo: disparador → uso → alivio → culpa', 'Nombré el hueco que me esconde el consumo', 'Conté a 1 persona que quiero intentar una salida']),
      quiz(
        '¿Por qué la culpa alimenta la adicción?',
        ['Es solo un sentimiento', 'Porque el ciclo es disparador→uso→alivio→CULPA→más uso: la culpa es el relleno de la carretera de retorno', 'La culpa no tiene que ver'],
        1,
        'Si rompes la culpa (alivio anti-culpa con redes, terapia, técnica), el ciclo pierde su motor. Por eso el autocastigo es el enemigo número uno.'
      ),
      qt('No eres tu peor decisión. Eres la persona que todavía está intentando salir.', 'desconocido'),
      act('Ver los recursos de apoyo gratuitos', '/library/l20'),
      end('Recaer no borra el avance: la recuperación se camina con recaídas en el bolsillo, no con ellas al frente. '),
    ],
  },

  l20: {
    minutes: 3,
    blocks: [
      intro('El apoyo real en Centroamérica existe y es GRATIS. Lo difícil no es encontrarlo: es el primer paso. Este mapa es tu abrebocas. '),
      st('✦', 'Líneas y centros', 'En tu pantalla SOS tienes líneas de crisis gratuitas de tu país 24/7. También: hospitales públicos (servicio de salud mental), iglesias y fundaciones con programas de adicciones.'),
      st('✦', 'Grupos de apoyo', 'Alcohólicos y Narcóticos Anónimos existen en toda CA y son gratis: busca "grupos AA/NA + tu ciudad". Reuniones diarias, cero juicio, anonimos.'),
      st('#', 'Chat y comunidad', 'Algunas ONG (ej. programa Jóvenes de tu ministerio de salud) tienen líneas de WhatsApp. Pregunta en tu centro de salud por "programa de adicciones de jóvenes".'),
      chk(['Guardé el SOS de mi país en mi teléfono', 'Busqué al menos 1 grupo de apoyo en mi ciudad', 'Pregunté en mi centro de salud por el programa de juventud']),
      quiz(
        '¿Quién puede ir a un grupo de apoyo (AA/NA)?',
        ['Solo alcohólicos graves con años de consumo', 'Cualquier persona que quiera cambiar su relación con el alcohol o drogas, sin importar cuánto consume', 'Nadie, es secreto'],
        1,
        'Los grupos abren la puerta desde la primera semana: no necesitas "llegar abajo" para pedir ayuda. Mientras antes, mejor.'
      ),
      tip('Pedir ayuda la primera vez da vergüenza: pide con un amigo, por WhatsApp o justo después de un "mal día". El primer sí es el más difícil.'),
      act('Ver mis líneas de emergencia', '/sos'),
      end('El único requisito para entrar a la salida es querer intentarlo. Y querer ya es empezar. '),
    ],
  },

  /* ============ SUICIDIO ============ */
  l21: {
    minutes: 1,
    blocks: [
      intro('Si estás leyendo esto con un hoyo negro adentro, detente: primero las líneas, después la teoría. Están para escucharte YA. '),
      st('✦', 'Nicaragua: Cruz Blanca 128 (24/7)', 'Atención de emergencias gratuita y confidencial en todo el país.'),
      st('✦', 'El Salvador: SEM 132 (24/7)', 'Atención médica de emergencias con psicólogos de guardia.'),
      st('✦', 'Guatemala: MSPAS 123', 'Línea del Ministerio de Salud para orientación en salud mental.'),
      st('✦', 'Honduras: 911', 'Sistema Nacional de Emergencias: coordina atención psicosocial.'),
      st('✦', 'Costa Rica: 1322 (24/7) y Aquí Estoy 800-2737869', 'Línea de psicólogos las 24 horas y línea de apoyo emocional.'),
      st('✦', 'Panamá: MIDES 147 (24/7)', 'Línea de atención de crisis del Ministerio de Desarrollo Social.'),
      chk(['Guardé en mi teléfono la línea de mi país', 'Si hoy es el día difícil, llamé o escribí a alguien real']),
      act('Abrir el SOS completo ahora', '/sos'),
      end('Estás leyendo esto: significa que una parte de ti quiere quedarse. Escucha a esa parte. '),
    ],
  },

  l22: {
    minutes: 4,
    blocks: [
      intro('Pedir ayuda cuando piensas en no seguir: el acto más valiente que existe. Aquí va el guion, palabra por palabra. '),
      st('✦', 'A quién llamar primero', 'Adulto de confianza (mamá, papá, tío, maestro, pastor) o profesional (líneas: +24 horas). No necesitas la persona "perfecta": necesitas una persona real.'),
      st('✦', 'El guion exacto', '"Necesito hablar de algo serio y me da mucho miedo. He tenido pensamientos de hacerme daño. No sé qué hacer y necesito que me ayudes a buscar ayuda."'),
      st('✦', 'Si no te escuchan a la primera', 'No es tu culpa. Prueba otra persona y sigue. Ya escribiste un tercio de la salida con saber decirlo.'),
      st('✦', 'Escríbelo si no puedes decirlo', 'Mándalo por texto o papel: "lee esto cuando puedas, es importante". La forma no importa: importa que salga.'),
      chk(['Elegí a mi persona 1 y mi persona 2 de emergencia', 'Memoricé o escribí el guion', 'Lo dije o lo envié (o me comprometo a decirlo hoy)']),
      quiz(
        'Te da miedo "preocupar" a quien le cuentas. La verdad...',
        ['Es mejor callar y aguantar', 'Preocuparse es la respuesta normal de alguien que te quiere: es justo lo que necesitas', 'Debo contárselo a nadie'],
        1,
        'Callar por cuidar la paz ajena es la mayor mentira que la depresión te dice. Tu vida vale más que la incomodidad del otro.'
      ),
      qt('El dolor inaguantable no tiene que aguantarse: se comparte, se divide y se trata.', 'ALIVIA'),
      act('Ver mis líneas de emergencia 24/7', '/sos'),
      end('Un solo "te escucho" puede cambiar toda la historia. Pide ese escucho hoy. '),
    ],
  },
};