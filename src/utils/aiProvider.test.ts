import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  looksLikeEcho,
  normalizeForEcho,
  trimReply,
  collapseWhitespace,
  parseSse,
  getModelReply,
  streamAiReply,
  analyzeJournalEntry,
  hasOnlineAI,
} from './aiProvider';

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const calls: FetchCall[] = [];

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Respuesta del proxy. El cliente habla con /api/ai/chat, no con Groq directo,
 * asi que el shape que ve es {text}, no el de OpenAI.
 */
const proxyChat = (text: string): Response => jsonResponse({ text, model: 'openai/gpt-oss-20b' });

/**
 * Body SSE con los chunks partidos de forma que rompe un parser ingenuo.
 * `parts` se emiten en trozos de `chunkSize` bytes, que es como llegan de verdad.
 */
const sseBody = (parts: string[], chunkSize = 17): ReadableStream<Uint8Array> => {
  const bytes = new TextEncoder().encode(parts.join(''));
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
};

/** Evento del formato del proxy (/api/ai/chat), no del de Groq. */
const proxyDelta = (text: string): string => `data: ${JSON.stringify({ type: 'delta', text })}\n\n`;
const proxyDone = (): string => `data: ${JSON.stringify({ type: 'done' })}\n\n`;
const proxyError = (reason: string): string =>
  `data: ${JSON.stringify({ type: 'error', reason })}\n\n`;

beforeEach(() => {
  calls.length = 0;
  vi.restoreAllMocks();
});

describe('normalizeForEcho', () => {
  it('quita tildes, que es justo lo que el filtro antiguo no hacia', () => {
    expect(normalizeForEcho('¿Cómo estás?')).toBe('como estas');
    expect(normalizeForEcho('MUY TRISTE')).toBe('muy triste');
  });
});

describe('looksLikeEcho', () => {
  it('detecta el eco exacto', () => {
    expect(looksLikeEcho('me siento solo', 'me siento solo')).toBe(true);
  });

  it('detecta el eco con distinta puntuacion y tildes', () => {
    expect(looksLikeEcho('¡Me siento muy solo!', 'me siento solo')).toBe(true);
  });

  it('detecta eco parcial por solapamiento de palabras', () => {
    // El filtro antiguo solo comparaba subcadena, asi que reformular el mensaje
    // de la persona pasaba como respuesta valida. Aqui casi todas las palabras
    // significativas vuelven, aunque la frase sea distinta.
    expect(looksLikeEcho('no estas durmiendo bien por el examen', 'no estoy durmiendo bien por el examen')).toBe(true);
  });

  it('no confunde una reformulacion con un eco', () => {
    expect(looksLikeEcho('no tienes a nadie, estas sola', 'me siento solo sin nadie')).toBe(false);
    expect(looksLikeEcho('noches sin dormir por el examen', 'no estoy durmiendo bien')).toBe(false);
  });

  it('no marca como eco una respuesta empatica de verdad', () => {
    expect(looksLikeEcho(
      'Gracias por contarme eso, ¿qué te está pasando hoy?',
      'me siento solo'
    )).toBe(false);
  });

  it('no explota con entradas vacias', () => {
    expect(looksLikeEcho('', 'hola')).toBe(false);
    expect(looksLikeEcho('hola', '')).toBe(false);
  });
});

describe('trimReply', () => {
  it('colapsa saltos de linea', () => {
    expect(collapseWhitespace('hola\n\n  mundo  ')).toBe('hola mundo');
  });

  it('recorta en el limite de palabra y anade elipsis', () => {
    const largo = 'palabra '.repeat(100);
    const out = trimReply(largo);
    expect(out.length).toBeLessThanOrEqual(421);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  ');
  });

  it('deja intacto un texto corto', () => {
    expect(trimReply('respuesta corta')).toBe('respuesta corta');
  });
});

describe('parseSse', () => {
  const collect = async (parts: string[], chunkSize = 17) => {
    const eventos = [];
    for await (const e of parseSse(sseBody(parts, chunkSize))) eventos.push(e);
    return eventos;
  };

  it('agrupa eventos aunque lleguen partidos en varios chunks', async () => {
    const eventos = await collect([
      'data: {"type":"open"}\n\n',
      proxyDelta('Hola'),
      proxyDelta(' otra vez'),
      'data: {"type":"done","model":"openai/gpt-oss-20b"}\n\n',
    ], 7);

    const deltas = eventos.filter(e => e.type === 'delta').map(e => e.text);
    expect(deltas).toEqual(['Hola', ' otra vez']);
    expect(eventos[eventos.length - 1]).toEqual({ type: 'done', model: 'openai/gpt-oss-20b' });
  });

  it('acepta el sentinel [DONE] de OpenAI', async () => {
    const tipos = (await collect([proxyDelta('x'), 'data: [DONE]\n\n'])).map(e => e.type);
    expect(tipos).toEqual(['delta', 'done']);
  });

  it('propaga los eventos de error', async () => {
    const eventos = await collect([proxyError('IA saturada')]);
    expect(eventos[0]).toEqual({ type: 'error', reason: 'IA saturada' });
  });

  it('ignora payloads que no son del protocolo del proxy', async () => {
    const eventos = await collect([proxyDelta('ok'), 'data: {"choices":[]}\n\n', proxyDone()]);
    expect(eventos.map(e => e.type)).toEqual(['delta', 'done']);
  });
});

describe('transporte y disponibilidad', () => {
  it('reporta disponibilidad segun la configuracion del entorno', () => {
    expect(typeof hasOnlineAI()).toBe('boolean');
  });
});

describe('getModelReply - camino con reglas', () => {
  it('cae a las reglas locales cuando fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      throw new TypeError('failed to fetch');
    }));

    const reply = await getModelReply('estoy muy ansioso por un examen', {
      history: [],
      crisisMode: false,
    });

    expect(reply.source).toBe('rules');
    expect(reply.text.length).toBeGreaterThan(0);
    expect(reply.mode).toBe('normal');
    expect(calls.length).toBeGreaterThan(0);
  });
});

describe('getModelReply - failover y reintentos', () => {
  it('reintenta el mismo modelo ante un 5xx antes de cambiar', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      n += 1;
      return n === 1 ? jsonResponse({ error: 'boom' }, 500) : proxyChat('Gracias por contarme eso.');
    }));

    const reply = await getModelReply('hola, como estas', { history: [], crisisMode: false });
    expect(reply.source).toBe('groq');
    // El primer modelo aguanta: un 5xx puntual no justifica cambiar de modelo.
    expect(new Set(calls.map(c => JSON.parse(String(c.init?.body)).model)).size).toBe(1);
    expect(n).toBe(2);
  }, 20000);

  it('cambia de modelo cuando el primero agota sus reintentos', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const model = JSON.parse(String(init?.body)).model;
      return model === 'openai/gpt-oss-20b'
        ? jsonResponse({ error: 'boom' }, 500)
        : proxyChat('Gracias por contarme eso.');
    }));

    const reply = await getModelReply('hola, como estas', { history: [], crisisMode: false });
    expect(reply.source).toBe('groq');
    const models = calls.map(c => JSON.parse(String(c.init?.body)).model);
    expect(models).toContain('openai/gpt-oss-20b');
    expect(models).toContain('openai/gpt-oss-120b');
  }, 30000);

  it('no reintenta ante un fallo de red: no hay servidor al que preguntar', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      n += 1;
      throw new TypeError('fetch failed');
    }));

    const reply = await getModelReply('hola', { history: [], crisisMode: false });
    expect(reply.source).toBe('rules');
    // Un solo intento: antes cada modelo reintentaba y tardaba 6s en caer.
    expect(n).toBe(1);
  }, 20000);
});

describe('modo crisis', () => {
  it('sugiere SOS y conectar cuando detecta crisis', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

    const reply = await getModelReply('ya no quiero vivir', { history: [], crisisMode: false });
    expect(reply.isCrisis).toBe(true);
    expect(reply.crisisLevel).toBeGreaterThanOrEqual(2);
    expect(reply.mode).toBe('crisis');
    expect(reply.suggest.map(s => s.path)).toEqual(expect.arrayContaining(['/sos', '/connect']));
  });

  it('anade la salida humana si la respuesta del modelo no la menciona', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const body = JSON.parse(String(init?.body));
      if (body.stream) return new Response(sseBody([proxyDelta('Piensa en algo bonito.'), proxyDone()]), {
        headers: { 'Content-Type': 'text/event-stream' },
      });
      return proxyChat('Piensa en algo bonito.');
    }));

    const reply = await getModelReply('quiero morirme', { history: [], crisisMode: false });
    expect(reply.isCrisis).toBe(true);
    expect(reply.text).toMatch(/confianza|línea|linea|SOS|emergencia/i);
  }, 20000);

  it('no anade el recordatorio si el modelo ya menciona la ayuda', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const texto = 'Puedes llamar hoy a una línea de crisis gratuita, de verdad.';
      if (body.stream) return new Response(sseBody([proxyDelta(texto), proxyDone()]), {
        headers: { 'Content-Type': 'text/event-stream' },
      });
      return proxyChat(texto);
    }));

    const reply = await getModelReply('quiero morirme', { history: [], crisisMode: false });
    const menciones = reply.text.match(/línea de crisis/gi) ?? [];
    expect(menciones.length).toBe(1);
  }, 20000);

  it('usa el prompt de crisis con la evidencia detectada', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const body = JSON.parse(String(init?.body));
      const sistema = body.messages[0].content;
      expect(sistema).toMatch(/conversaci[óo]n de crisis/);
      expect(sistema).toMatch(/m[ée]todo concreto/);
      expect(body.params.temperature).toBeLessThan(0.6);
      return proxyChat('Estoy aqui contigo, no estas sola. Hay una linea de crisis si la necesitas.');
    }));

    const reply = await getModelReply('ya me tome las pastillas', { history: [], crisisMode: false });
    expect(reply.crisisLevel).toBe(3);
    expect(reply.urgent).toBe(true);
  }, 20000);
});

describe('salida del modo crisis', () => {
  it('cierra el modo cuando la persona dice que esta bien', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const texto = 'Gracias por contarlo. Aqui sigo si necesitas algo.';
      if (body.stream) return new Response(sseBody([proxyDelta(texto), proxyDone()]), {
        headers: { 'Content-Type': 'text/event-stream' },
      });
      return proxyChat(texto);
    }));

    const reply = await getModelReply('ya estoy bien, gracias', {
      history: [],
      crisisMode: true,
    });
    expect(reply.exitedCrisis).toBe(true);
    expect(reply.isCrisis).toBe(false);
  }, 20000);

  it('mantiene el modo crisis si sigue habiendo se[o]al grave', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

    const reply = await getModelReply('estoy bien pero ya me corte las venas', {
      history: [],
      crisisMode: true,
    });
    expect(reply.exitedCrisis).toBeFalsy();
    expect(reply.mode).toBe('crisis');
  });
});

describe('streamAiReply', () => {
  it('entrega deltas incrementales y devuelve el texto completo', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const body = JSON.parse(String(init?.body));
      if (!body.stream) return jsonResponse({ text: 'completo' });
      return new Response(
        sseBody([
          'data: {"type":"open"}\n\n',
          proxyDelta('Hola '),
          proxyDelta('me llamo VIA.'),
          proxyDone(),
        ]),
        { headers: { 'Content-Type': 'text/event-stream' } }
      );
    }));

    const parciales: string[] = [];
    const reply = await streamAiReply('hola', { history: [], crisisMode: false }, {
      onDelta: (_d, full) => parciales.push(full),
    });

    expect(parciales).toEqual(['Hola ', 'Hola me llamo VIA.']);
    expect(reply.source).toBe('groq');
    expect(reply.text).toContain('VIA');
  }, 20000);

  it('acepta una respuesta JSON aunque se pidiera streaming', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ text: 'Respuesta sin stream' })));

    const reply = await streamAiReply('hola', { history: [], crisisMode: false });
    expect(reply.source).toBe('groq');
    expect(reply.text).toBe('Respuesta sin stream');
  }, 20000);

  it('cae a reglas si el stream llega vacio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sseBody([proxyError('IA no disponible')]), {
      headers: { 'Content-Type': 'text/event-stream' },
    })));

    const reply = await streamAiReply('estoy muy triste', { history: [], crisisMode: false });
    expect(reply.source).toBe('rules');
    expect(reply.text.length).toBeGreaterThan(0);
  }, 20000);
});

describe('rate limit de Groq', () => {
  it('propaga el 429 sin reintentar infinitamente', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      n += 1;
      return jsonResponse({ error: 'rate limited' }, 429);
    }));

    const reply = await getModelReply('hola', { history: [], crisisMode: false });
    expect(reply.source).toBe('rules');
    expect(n).toBeLessThan(20);
  }, 30000);
});

describe('analyzeJournalEntry', () => {
  it('detecta crisis en el diario', () => {
    const r = analyzeJournalEntry('hoy no quiero vivir, es demasiado');
    expect(r.crisis).toBe(true);
    expect(r.valence).toBe(-1);
  });

  it('detecta ansiedad con valence negativa', () => {
    const r = analyzeJournalEntry('estoy muy ansioso por el examen');
    expect(r.crisis).toBe(false);
    expect(r.valence).toBeLessThan(0);
    expect(r.topics.length).toBeGreaterThan(0);
  });

  it('detecta tono positivo', () => {
    const r = analyzeJournalEntry('hoy me sentí muy bien, un logro grande');
    expect(r.valence).toBeGreaterThan(0.5);
    expect(r.topics).toContain('positivo');
  });

  it('tolera texto vacio', () => {
    expect(analyzeJournalEntry('   ')).toEqual({
      emotion: 'neutro', valence: 0, topics: [], crisis: false,
    });
  });
});