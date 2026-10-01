import { describe, it, expect } from 'vitest';
import { assessCrisis, normalize, describeCrisis, hasUrgentCrisis, isCrisisSafeExit } from './crisisSafety';

describe('normalize', () => {
  it('quita tildes, mayusculas y puntuacion', () => {
    expect(normalize('¿Cómo estás, Ana?')).toBe('como estas ana');
    expect(normalize('¡NO!  Matarme...')).toBe('no matarme');
  });

  it('colapsa espacios y tolera entrada vacia', () => {
    expect(normalize('  a   b  ')).toBe('a b');
    expect(normalize('')).toBe('');
    expect(normalize(undefined as unknown as string)).toBe('');
  });
});

describe('deteccion de crisis - senales explicitas', () => {
  const casos: Array<[string, number]> = [
    ['quiero morirme', 2],
    ['ya no quiero vivir', 2],
    ['pienso en hacerme daño', 2],
    ['me quiero matar', 2],
    ['no aguanto más', 2],
    ['ya tomé las pastillas', 3],
    ['voy a ahorcarme', 3],
    ['tengo el arma en la mano', 3],
    ['me estoy cortando los brazos', 3],
    ['ya lo hice', 3],
    ['esta noche no llego a mañana', 3],
  ];

  for (const [texto, nivel] of casos) {
    it(`detecta nivel >= ${nivel} en "${texto}"`, () => {
      const r = assessCrisis(texto);
      expect(r.isCrisis).toBe(true);
      expect(r.level).toBeGreaterThanOrEqual(nivel as 1 | 2 | 3);
    });
  }
});

describe('deteccion de crisis - senales tempranas', () => {
  it('tratea "no puedo más" como nivel 1, no crisis urgente', () => {
    const r = assessCrisis('no puedo más, todo es demasiado');
    expect(r.isCrisis).toBe(true);
    expect(r.urgent).toBe(false);
  });

  it('tratea "ayúdame por favor" como nivel 1', () => {
    const r = assessCrisis('ayúdame por favor, no sé qué hacer');
    expect(r.isCrisis).toBe(true);
    expect(r.level).toBe(1);
  });

  it('detecta "ojalá no hubiera nacido"', () => {
    expect(assessCrisis('ojalá no hubiera nacido').isCrisis).toBe(true);
  });
});

describe('deteccion de crisis - texto obfuscado', () => {
  it('detecta letras separadas por espacios', () => {
    expect(assessCrisis('q u i e r o   m o r i r').isCrisis).toBe(true);
  });

  it('detecta texto sin espacios', () => {
    expect(assessCrisis('quieromorirme').isCrisis).toBe(true);
  });
});

describe('deteccion de crisis - falsos positivos que NO deben disparar', () => {
  const noCrisis = [
    'me siento ansioso por el examen',
    'hoy no quiero seguir con la novela, me aburre',
    'estoy muerto de hambre',
    'no quiero morir de risa con este chiste',
    'no aguanto más a mi jefe, es insoportable',
    'quiero hacer el chequeo de bienestar',
    'llévame al diario',
    'me duele la cabeza desde ayer',
    'no veo la hora de que sea vacaciones',
    'estoy muy cansado pero bien',
    'me dijo que va a morir de viejo algun dia',
    'en la clase de biologia vimos la muerte celular',
  ];

  for (const texto of noCrisis) {
    it(`no marca crisis en "${texto}"`, () => {
      expect(assessCrisis(texto).isCrisis).toBe(false);
    });
  }

  it('no aplica los patrones sin espacios a prosa normal', () => {
    // "morir" suelto solo debe contar como señal si el texto viene obfuscado.
    expect(assessCrisis('me quiero morir por ese perro, lo que mas duele').isCrisis).toBe(true);
    expect(assessCrisis('en clase de relajo vimos un documental de como muere un pez').isCrisis).toBe(false);
  });
});

describe('contexto heredado del historial', () => {
  it('sube a nivel 3 con "si lo hago" si antes hablo de un metodo', () => {
    const r = assessCrisis('si lo hago, ya no tiene sentido seguir', [
      'estoy pensando en cortarme las venas',
    ]);
    expect(r.isCrisis).toBe(true);
    expect(r.level).toBe(3);
  });

  it('sube a nivel 2 con una frase implicita sobre "querer morir"', () => {
    const r = assessCrisis('mañana no voy a estar', ['ya no quiero vivir']);
    expect(r.isCrisis).toBe(true);
    expect(r.level).toBeGreaterThanOrEqual(2);
  });

  it('"si lo hago" sin historial previo NO dispara crisis', () => {
    expect(assessCrisis('si lo hago, paso de largo').isCrisis).toBe(false);
  });
});

describe('salida del modo crisis', () => {
  it('reconoce "ya estoy bien"', () => {
    const r = assessCrisis('ya estoy bien, gracias');
    expect(r.isCrisis).toBe(false);
    expect(r.safeToExit).toBe(true);
  });

  it('reconoce "ya no me quiero morir" sin reabrir la crisis', () => {
    const r = assessCrisis('ya no me quiero morir, de verdad');
    expect(r.level).toBeGreaterThanOrEqual(2);
    expect(r.safeToExit).toBe(true);
  });

  it('NO permite salir si sigue habiendo senal grave', () => {
    const r = assessCrisis('estoy bien pero ya me corté las venas');
    expect(r.level).toBe(3);
    expect(r.safeToExit).toBe(false);
  });

  it('expone isCrisisSafeExit', () => {
    expect(isCrisisSafeExit('ya estoy bien')).toBe(true);
    expect(isCrisisSafeExit('quiero morirme')).toBe(false);
  });
});

describe('evidencia y metadatos', () => {
  it('reporta la evidencia mas grave primero', () => {
    const r = assessCrisis('quiero morirme y ya me tome las pastillas');
    expect(r.evidence[0].id).toBe('metodo');
    expect(r.urgent).toBe(true);
  });

  it('describe la evidencia en espanol para el prompt', () => {
    const r = assessCrisis('quiero morirme');
    expect(describeCrisis(r)).toContain('quiere morir');
  });

  it('hasUrgentCrisis distingue nivel 2 de nivel 1', () => {
    expect(hasUrgentCrisis('quiero morirme')).toBe(true);
    expect(hasUrgentCrisis('ayúdame por favor')).toBe(false);
  });

  it('devuelve estado vacio para entrada vacia', () => {
    expect(assessCrisis('   ')).toEqual({
      level: 0,
      isCrisis: false,
      urgent: false,
      evidence: [],
      safeToExit: false,
      normalized: '',
    });
  });
});
