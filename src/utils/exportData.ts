/* ----------------------------------------------------
   ALIVIA - EXPORTACIÓN DE DATOS
   El usuario es dueño de su información: JSON completo
   para respaldo/portabilidad y un reporte HTML imprimible.
   ---------------------------------------------------- */

import {
  getMoodHistory,
  getCompletedActivities,
  getPlans,
  getEmergencyContact,
  type MoodEntry,
  type CompletedActivity,
  type EmergencyContact,
  type Plan,
} from './localDb';
import { getMyAssessments, type AssessmentRecord } from './assessment';
import { getAllJournalEntries, type JournalRecord } from './journalDb';

export interface AliviaExport {
  app: 'ALIVIA';
  version: number;
  exportedAt: string;
  moodEntries: MoodEntry[];
  completedActivities: CompletedActivity[];
  emergencyContact: EmergencyContact | null;
  assessments: AssessmentRecord[];
  plans: Plan[];
  journalEntries: JournalRecord[];
}

export const collectExport = async (): Promise<AliviaExport> => {
  const [moodEntries, completedActivities, emergencyContact, assessments, plans, journalEntries] =
    await Promise.all([
      getMoodHistory().catch(() => [] as MoodEntry[]),
      getCompletedActivities(),
      getEmergencyContact(),
      getMyAssessments(),
      getPlans(),
      Promise.resolve(getAllJournalEntries()),
    ]);
  return {
    app: 'ALIVIA',
    version: 1,
    exportedAt: new Date().toISOString(),
    moodEntries,
    completedActivities,
    emergencyContact,
    assessments,
    plans,
    journalEntries,
  };
};

const triggerDownload = (content: string, filename: string, mime: string): void => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;'
  );

const fecha = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};

export const downloadJsonExport = async (): Promise<void> => {
  const data = await collectExport();
  triggerDownload(
    JSON.stringify(data, null, 2),
    `alivia-datos-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  );
};

export const downloadHtmlReport = async (): Promise<void> => {
  const d = await collectExport();

  const moodRows = d.moodEntries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => `<tr><td>${esc(m.date)}</td><td>${m.score}/5</td><td>${esc(m.note || '')}</td></tr>`)
    .join('');

  const activityRows = d.completedActivities
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => `<tr><td>${esc(a.date)}</td><td>${esc(a.title)}</td></tr>`)
    .join('');

  const assessmentRows = d.assessments
    .map(
      (a) =>
        `<tr><td>${fecha(a.created_at)}</td><td>${a.stress}/15</td><td>${a.anxiety}/15</td><td>${a.depression}/15</td><td>${esc(a.level)}</td></tr>`
    )
    .join('');

  const planBlocks = d.plans
    .map(
      (p) =>
        `<h3>${esc(p.title)}</h3><ul>${p.goals
          .map((g) => `<li${g.done ? ' style="text-decoration:line-through;color:#888"' : ''}>${esc(g.title)}</li>`)
          .join('')}</ul>`
    )
    .join('');

  const journalBlocks = d.journalEntries.length
    ? d.journalEntries
        .map((j) => {
          const temas = Array.isArray(j.topics) ? j.topics.join(' · ') : '';
          return `<p class="jr"><b>${fecha(j.date)}</b> — ${esc(j.emotion)}${temas ? ` · ${esc(temas)}` : ''}${j.crisis ? ' · ⚠ momento de crisis acompañado' : ''}</p>`;
        })
        .join('')
    : '<p class="empty">Sin entradas registradas.</p>';

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Mi reporte ALIVIA — ${fecha(d.exportedAt)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;max-width:760px;margin:40px auto;color:#1c2b22;line-height:1.6;padding:0 20px}
  h1{font-size:26px;margin-bottom:2px} h2{margin-top:34px;border-bottom:2px solid #2C533D;padding-bottom:4px;font-size:19px}
  h3{margin-bottom:4px} small{color:#7c8a81}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #dde5df}
  th{background:#eef3ee;font-family:system-ui,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
  .jr{border-left:3px solid #8CB08D;margin:10px 0;padding:6px 12px;background:#f4f8f4;font-size:14px}
  .empty{color:#98a69d;font-style:italic}
  header p{color:#5c6b61;margin-top:0}
  @media print{body{margin:12mm auto}}
</style></head><body>
<header><h1>Mi reporte ALIVIA</h1><p>Emitido el ${fecha(d.exportedAt)} · Equipo DataStorm · Documento privado del usuario</p></header>

<h2>Estado de ánimo (${d.moodEntries.length})</h2>
<table><thead><tr><th>Fecha</th><th>Puntaje</th><th>Nota</th></tr></thead><tbody>${
    moodRows || '<tr><td colspan="3" class="empty">Sin registros.</td></tr>'
  }</tbody></table>

<h2>Chequeos de bienestar (${d.assessments.length})</h2>
<table><thead><tr><th>Fecha</th><th>Estrés</th><th>Ansiedad</th><th>Depresión</th><th>Nivel</th></tr></thead><tbody>${
    assessmentRows || '<tr><td colspan="5" class="empty">Sin registros.</td></tr>'
  }</tbody></table>

<h2>Actividades completadas (${d.completedActivities.length})</h2>
<table><thead><tr><th>Fecha</th><th>Actividad</th></tr></thead><tbody>${
    activityRows || '<tr><td colspan="2" class="empty">Sin registros.</td></tr>'
  }</tbody></table>

<h2>Mis planes (${d.plans.length})</h2>
${planBlocks || '<p class="empty">Sin planes.</p>'}

<h2>Diario de desahogo (${d.journalEntries.length})</h2>
${journalBlocks}

<p style="margin-top:44px" class="empty">Generado localmente en tu dispositivo. Para imprimir o guardar como PDF usa Ctrl/Cmd + P.</p>
</body></html>`;

  triggerDownload(html, `alivia-informe-${new Date().toISOString().slice(0, 10)}.html`, 'text/html');
};
