import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { shouldRun, logRun, runRadar, runPublisher, runCobranca, runEstoque, runMarket } from '@/lib/cron';

export const maxDuration = 60;

const JOBS: Record<string, { fn: () => Promise<string>; minGapMin: number }> = {
  radar: { fn: runRadar, minGapMin: 60 },
  publisher: { fn: runPublisher, minGapMin: 5 },
  cobranca: { fn: runCobranca, minGapMin: 60 },
  estoque: { fn: runEstoque, minGapMin: 60 },
  market: { fn: runMarket, minGapMin: 360 },
  ops: { fn: async () => [await runPublisher(), await runCobranca(), await runEstoque()].join(' · '), minGapMin: 10 },
};

/* Executor de jobs: Vercel Cron (header do agendador), admin logado (botão "Rodar agora")
   ou execução oportunista (?opportunistic=1 — respeita a janela mínima e roda em silêncio). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  const def = JOBS[job];
  if (!def) return NextResponse.json({ error: 'job desconhecido' }, { status: 404 });

  const isVercelCron = req.headers.get('x-vercel-cron') === '1' || !!req.headers.get('x-vercel-signature');
  const opportunistic = req.nextUrl.searchParams.get('opportunistic') === '1';
  const session = await getSession();
  const isAdmin = session?.role === 'admin';

  if (!isVercelCron && !isAdmin && !opportunistic) {
    return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  }
  if ((opportunistic || isVercelCron) && !(await shouldRun(job, def.minGapMin))) {
    return NextResponse.json({ ok: true, skipped: 'janela mínima' });
  }

  try {
    const detail = await def.fn();
    await logRun(job, true, detail);
    return NextResponse.json({ ok: true, job, detail });
  } catch (e) {
    const msg = (e as Error).message;
    await logRun(job, false, msg);
    return NextResponse.json({ ok: false, job, error: msg }, { status: 500 });
  }
}
