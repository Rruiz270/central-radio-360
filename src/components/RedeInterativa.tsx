'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Bar, Chip, Mini, fmtBRL } from './ui';

type Tenant = {
  id: number; slug: string; name: string; freq: string; city: string; uf: string;
  is_hq: boolean; system: string; migration_phase: number; listeners: number;
  revenue_month: string; map_x: string; map_y: string;
};

const FASES = ['—', 'Diagnóstico', 'Coexistência', 'Espelhar dados', 'Playout piloto', 'Cutover', 'Completo'];
const fmtK = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : `${Math.round(n / 1000)}k`);

function dotCls(t: Tenant) {
  return t.is_hq ? 'matriz' : t.system === 'c360' ? 'c360' : t.system === 'migrando' ? 'mig' : 'pulsar';
}

export function RedeInterativa({ tenants }: { tenants: Tenant[] }) {
  const [open, setOpen] = useState<Tenant | null>(null);

  const card = (t: Tenant) => (
    <div
      key={t.id}
      className={`aff ${t.is_hq ? 'matriz' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={() => setOpen(t)}
      data-praca={t.slug}
    >
      <div className="h">
        <div className="fq">{t.freq}<br />{t.uf}</div>
        <div><b>{t.name}</b><div className="tiny muted">{t.city} / {t.uf}</div></div>
        <span style={{ marginLeft: 'auto' }}>
          {t.is_hq ? <Chip tone="amber">Matriz</Chip>
            : t.system === 'c360' ? <Chip tone="green">Central 360</Chip>
            : t.system === 'migrando' ? <Chip tone="amber">Migrando</Chip>
            : <Chip tone="gray">Pulsar</Chip>}
        </span>
      </div>
      <div className="mini">
        <div><div className="v">{fmtK(Number(t.listeners))}</div><div className="l">ouvintes</div></div>
        <div><div className="v">{fmtBRL(Number(t.revenue_month))}</div><div className="l">receita</div></div>
        <div><div className="v">{t.system === 'c360' ? 'no ar' : FASES[t.migration_phase]}</div><div className="l">{t.system === 'c360' ? 'status' : 'migração'}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn p sm" onClick={(e) => { e.stopPropagation(); setOpen(t); }}>Painel da praça</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mapwrap-svg">
        <svg className="mapbr" viewBox="0 0 240 236" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="landg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#13215f" /><stop offset="1" stopColor="#0a1233" />
            </linearGradient>
            <pattern id="mdots" width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="1.2" cy="1.2" r=".9" fill="rgba(122,150,255,.25)" />
            </pattern>
          </defs>
          <path className="land" d="M78,16 L100,8 L114,20 L130,26 L150,33 L167,43 L186,53 L193,66 L187,84 L177,101 L169,121 L159,139 L142,151 L130,167 L124,183 L113,200 L101,211 L92,197 L96,179 L86,168 L77,151 L63,141 L57,119 L36,111 L31,97 L45,85 L38,69 L51,53 L65,41 L71,27 Z" />
          <path className="landdots" d="M78,16 L100,8 L114,20 L130,26 L150,33 L167,43 L186,53 L193,66 L187,84 L177,101 L169,121 L159,139 L142,151 L130,167 L124,183 L113,200 L101,211 L92,197 L96,179 L86,168 L77,151 L63,141 L57,119 L36,111 L31,97 L45,85 L38,69 L51,53 L65,41 L71,27 Z" fill="url(#mdots)" />
          <g className="beams">
            {tenants.filter((t) => !t.is_hq).map((t) => (
              <path key={t.id} className="beam" d={`M137,150 Q${(137 + Number(t.map_x)) / 2 + 12},${(150 + Number(t.map_y)) / 2 - 20} ${t.map_x},${t.map_y}`} />
            ))}
          </g>
          {tenants.map((t) => (
            <g
              key={t.id}
              className={`mapdot ${dotCls(t)}`}
              transform={`translate(${t.map_x},${t.map_y})`}
              onClick={() => setOpen(t)}
              data-mapdot={t.slug}
            >
              <circle className="rip" r={t.is_hq ? 8 : 6}>
                <animate attributeName="r" values={t.is_hq ? '7;20' : '5;14'} dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".6;0" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle r={t.is_hq ? 7 : 5} />
              <text x={Number(t.map_x) > 150 ? -10 : 10} y="4" textAnchor={Number(t.map_x) > 150 ? 'end' : 'start'}>
                {t.freq}{t.is_hq ? ' SP' : ''}
              </text>
            </g>
          ))}
        </svg>
        <div className="maplegend">
          <span><i style={{ background: '#3d5eff' }} />Matriz</span>
          <span><i style={{ background: '#25c257' }} />Central 360</span>
          <span><i style={{ background: '#ffe200' }} />Migrando</span>
          <span><i style={{ background: '#8791ab' }} />Pulsar</span>
        </div>
      </div>

      <div className="affgrid" style={{ marginTop: 16 }}>
        {tenants.map(card)}
      </div>

      {open && (
        <Modal
          title={`${open.name} · ${open.freq}`}
          stage={open.is_hq ? 'Matriz' : open.system === 'c360' ? 'Central 360' : open.system === 'migrando' ? 'Migrando' : 'Pulsar'}
          stageTone={open.is_hq ? 'amber' : open.system === 'c360' ? 'green' : open.system === 'migrando' ? 'amber' : 'gray'}
          onClose={() => setOpen(null)}
        >
          <Mini items={[
            { v: fmtK(Number(open.listeners)), l: 'ouvintes/dia' },
            { v: fmtBRL(Number(open.revenue_month)), l: 'receita/mês' },
            { v: open.uf, l: open.city },
          ]} />
          <div style={{ margin: '16px 0 6px' }} className="tiny muted">
            Migração Pulsar → Central 360 · fase {open.migration_phase}/6 — <b className="b">{FASES[open.migration_phase]}</b>
          </div>
          <Bar pct={(open.migration_phase / 6) * 100} />
          <div className="tl" style={{ marginTop: 16 }}>
            {FASES.slice(1).map((f, i) => (
              <div className="ti" key={f}>
                <b style={{ opacity: i < open.migration_phase ? 1 : 0.45 }}>{i + 1}. {f}</b>
                <div className="t">{i < open.migration_phase ? 'concluída' : i === open.migration_phase ? 'em andamento' : 'pendente'}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setOpen(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
