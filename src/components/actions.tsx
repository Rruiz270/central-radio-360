'use client';

/* Botões de ação pequenos e reutilizáveis que faltavam ligar */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

/* Export BXF — gera o XML de automação a partir dos breaks reais e baixa o arquivo */
export function BxfExport({ breaks, spots }: {
  breaks: { id: number; hour: number; limit_sec: number }[];
  spots: { id: number; advertiser: string; duration_sec: number; break_id: number | null }[];
}) {
  const toast = useToast();
  function exportBxf() {
    const day = new Date().toISOString().slice(0, 10);
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<BxfMessage xmlns="http://smpte-ra.org/schemas/2021/2008/BXF" origin="Central360" originType="Traffic" dateTime="${day}">`,
      ...breaks.map((b) => {
        const inBreak = spots.filter((s) => s.break_id === b.id);
        return [
          `  <NonProgramEvent><EventData><StartDateTime>${day}T${String(b.hour).padStart(2, '0')}:00:00</StartDateTime><LengthOption max="${b.limit_sec}"/></EventData>`,
          ...inBreak.map((s, i) => `    <Content position="${i + 1}"><Name>${s.advertiser}</Name><Duration>PT${s.duration_sec}S</Duration></Content>`),
          '  </NonProgramEvent>',
        ].join('\n');
      }),
      '</BxfMessage>',
    ].join('\n');
    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `central360-log-${day}.bxf.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Log exportado em BXF — pronto pra automação/playout.', 'ok');
  }
  return <button className="btn sm" style={{ marginLeft: 8 }} onClick={exportBxf} data-testid="bxf">Export automação (BXF)</button>;
}

/* Upload de material (portal + módulo interno) — arquivo REAL (até 8 MB) */
export function UploadMaterial({ campaignId, token }: { campaignId: number; token?: string }) {
  const toast = useToast();
  const router = useRouter();
  const inp = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    toast(`Enviando "${file.name}"…`, 'ok');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('campaign_id', String(campaignId));
    if (token) fd.append('token', token);
    const res = await fetch('/api/files', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { toast(`Material "${file.name}" recebido — em análise da produção.`, 'ok'); router.refresh(); }
    else toast(data.error || 'Falha ao subir material.', 'warn');
    e.target.value = '';
  }

  return (
    <>
      <div className="drop" onClick={() => inp.current?.click()} data-testid="drop">
        Arraste aqui ou clique para <b>subir um material</b> (áudio, imagem ou vídeo)
      </div>
      <input ref={inp} type="file" accept="audio/*,video/*,image/*" style={{ display: 'none' }} onChange={onFile} />
    </>
  );
}

/* Pricing Copilot — aplicar sugestão */
export function PricingApply({ daypart, price, label }: { daypart: string; price: number; label: string }) {
  const toast = useToast();
  const router = useRouter();
  const [done, setDone] = useState(false);
  async function apply() {
    const res = await fetch('/api/rate-card/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daypart, price }),
    });
    if (res.ok) { setDone(true); toast(`${label} — novo preço R$ ${price} aplicado no rate card.`, 'ok'); router.refresh(); }
    else toast('Não foi possível aplicar.', 'warn');
  }
  return done
    ? <span className="chip c-green">aplicado</span>
    : <button className="btn sm p" onClick={apply} data-testid={`pricing-${daypart}`}>Aplicar</button>;
}

/* Emissão de NFS-e */
export function InvoiceEmitButtons() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function emit(mode: 'batch' | 'single') {
    setBusy(true);
    const res = await fetch('/api/invoices/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      toast(data.emitted > 0
        ? `NFS-e emitida p/ ${data.emitted} fatura(s): ${data.clients.join(', ')}. (Agregador real entra com o certificado digital.)`
        : 'Nenhuma fatura pendente de emissão.', data.emitted > 0 ? 'ok' : 'warn');
      router.refresh();
    } else toast(data.error || 'Falha na emissão.', 'warn');
  }
  return (
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
      <button className="btn sm" disabled={busy} onClick={() => emit('batch')} data-testid="nfse-batch">Em lote (batch)</button>
      <button className="btn sm p" disabled={busy} onClick={() => emit('single')} data-testid="nfse-single">On-demand</button>
    </div>
  );
}

/* Gerar briefing (planejamento) → cria ação em Briefing */
export function BriefingForm() {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState({ name: 'Verão RioMar — Rádio na Praia', objetivo: 'Sampling + brand', publico: 'Famílias, 25–45', mecanica: 'Locutor ao vivo + sorteio a cada hora + brindes' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function gerar() {
    if (!f.name) { toast('Dê um nome à ação.', 'warn'); return; }
    const res = await fetch('/api/activations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.name, client: f.objetivo, city: 'a definir' }),
    });
    if (res.ok) { toast('Briefing criado — ação entrou no quadro de Execução e Operações foi avisada.', 'ok'); router.refresh(); }
    else toast('Falha ao gerar briefing.', 'warn');
  }

  return (
    <div>
      <div className="form">
        <div className="field full"><label>Nome da ação</label><input value={f.name} onChange={set('name')} /></div>
        <div className="field"><label>Objetivo</label>
          <select value={f.objetivo} onChange={set('objetivo')}>
            <option>Sampling + brand</option><option>Geração de leads</option><option>Test drive</option>
          </select>
        </div>
        <div className="field"><label>Público</label><input value={f.publico} onChange={set('publico')} /></div>
        <div className="field full"><label>Mecânica / roteiro</label><input value={f.mecanica} onChange={set('mecanica')} /></div>
      </div>
      <button className="btn p" style={{ marginTop: 14 }} onClick={gerar} data-testid="gerar-briefing">Gerar briefing p/ execução →</button>
    </div>
  );
}
