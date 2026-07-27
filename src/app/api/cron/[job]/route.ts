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

/* Executor de jobs. Autorização:
   - Vercel Cron: Authorization: Bearer CRON_SECRET (env; a Vercel injeta automaticamente)
   - Admin logado: botão "Rodar agora" (sem janela mínima)
   - Sessão logada + ?opportunistic=1: execução silenciosa respeitando a janela mínima
   Anônimo: 401 sempre. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  const def = JOBS[job];
  if (!def) return NextResponse.json({ error: 'job desconhecido' }, { status: 404 });

  const secret = process.env.CRON_SECRET;
  const isVercelCron = !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
  const opportunistic = req.nextUrl.searchParams.get('opportunistic') === '1';
  const session = await getSession();
  const isAdmin = session?.role === 'admin';

  if (!isVercelCron && !isAdmin && !(opportunistic && session)) {
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
