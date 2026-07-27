'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

const ENTITIES: Record<string, { label: string; header: string; example: string }> = {
  anunciantes: { label: 'Anunciantes', header: 'nome,agencia,limite_credito', example: 'Casas Bahia,AlmapBBDO,150000' },
  propostas: { label: 'Propostas (funil)', header: 'anunciante,formato,valor,etapa,vendedor', example: 'Óticas Carol,spots 30",18000,Lead,Bruno' },
  pedidos: { label: 'Pedidos (flights)', header: 'anunciante,inicio,fim,daypart,insercoes,duracao_seg,valor', example: 'Casas Bahia,2026-08-01,2026-08-31,Manhã (6–10h),180,30,120000' },
  musicas: { label: 'Acervo musical', header: 'titulo,interprete,cod_categoria,categoria,bpm,ano,origem,intervalo_h', example: 'Evidências,Chitãozinho & Xororó,07,Clássicos,92,1990,Nacional,4' },
  campanhas: { label: 'Campanhas (portal)', header: 'anunciante,nome,periodo,contratadas,investimento', example: 'Guaraná,Verão 2026,01/12 – 31/01,120,48000' },
  equipamentos: { label: 'Equipamentos', header: 'tipo,nome,qtd,status,obs', example: 'caixa,Caixa JBL 15",5,disponivel,' },
  equipe: { label: 'Equipe / escala', header: 'nome,funcao,turno,dias,status', example: 'João Locutor,Locução,Manhã 6–10h,Seg–Sex,escalado' },
};

export function Importers() {
  const toast = useToast();
  const router = useRouter();
  const [entity, setEntity] = useState('anunciantes');
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const meta = ENTITIES[entity];

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setCsv);
  }

  async function run() {
    if (!csv.trim()) { toast('Cole o CSV ou selecione o arquivo.', 'warn'); return; }
    setBusy(true);
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, csv }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { toast(`${data.imported} registros importados em ${meta.label}.`, 'ok'); setCsv(''); router.refresh(); }
    else toast(data.error || 'Falha no import.', 'warn');
  }

  return (
    <div>
      <div className="form" style={{ marginBottom: 12 }}>
        <div className="field"><label>O que importar</label>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} data-testid="import-entity">
            {Object.entries(ENTITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="field"><label>Arquivo .csv (ou cole abaixo)</label><input type="file" accept=".csv,text/csv" onChange={onFile} /></div>
      </div>
      <div className="tiny muted" style={{ marginBottom: 6 }}>
        Cabeçalho esperado (1ª linha, vírgula ou ponto-e-vírgula): <code>{meta.header}</code>
      </div>
      <textarea
        className="mono"
        style={{ width: '100%', minHeight: 140, borderRadius: 10, padding: 10, fontFamily: 'Menlo, monospace', fontSize: 12 }}
        placeholder={`${meta.header}\n${meta.example}`}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        data-testid="import-csv"
      />
      <button className="btn p" style={{ marginTop: 12 }} disabled={busy} onClick={run} data-testid="import-run">
        {busy ? 'Importando…' : 'Importar'}
      </button>
    </div>
  );
}
