'use client';

import { useState } from 'react';
import { useToast } from './Toast';

const METAS = [
  ['Energia (calmo ↔ agitado)', 68],
  ['Variedade de gênero', 55],
  ['Rotação de artista (evitar repetir)', 80],
  ['Época (clássicos ↔ novidades)', 45],
  ['Peso comercial na grade', 30],
] as const;

export function MetasIA() {
  const toast = useToast();
  const [vals, setVals] = useState(METAS.map(([, v]) => v as number));
  const [generated, setGenerated] = useState(false);

  return (
    <div>
      {METAS.map(([label], i) => (
        <div className="field" style={{ marginBottom: 14 }} key={label}>
          <label>{label} · {vals[i]}%</label>
          <input
            type="range" min={0} max={100} value={vals[i]}
            onChange={(e) => setVals(vals.map((v, j) => (j === i ? Number(e.target.value) : v)))}
          />
        </div>
      ))}
      <button
        className="btn p"
        style={{ marginTop: 8 }}
        onClick={() => { setGenerated(true); toast(`Grade otimizada gerada — energia ${vals[0]}% · variedade ${vals[1]}%.`, 'ok'); }}
      >
        Gerar grade otimizada
      </button>
      {generated && (
        <div className="hint" style={{ marginTop: 14 }}>
          Metas atingidas: energia {vals[0]}% · variedade {vals[1]}% · nenhum artista repetido em 3h. Prévia atualizada ao lado.
        </div>
      )}
    </div>
  );
}
