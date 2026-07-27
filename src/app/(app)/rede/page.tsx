import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { Kpi, SecTitle, Card, Chip, Hint, Bar } from '@/components/ui';
import { RedeInterativa } from '@/components/RedeInterativa';
import { QuickAdd } from '@/components/QuickAdd';

export const dynamic = 'force-dynamic';

const FASES = ['—', 'Diagnóstico', 'Coexistência', 'Espelhar dados', 'Playout piloto', 'Cutover', 'Completo'];

function fmtK(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : `${Math.round(n / 1000)}k`;
}

export default async function RedePage() {
  const session = await requireModule('rede');
  const tenants = await sql`SELECT *, revenue_month::text, created_at::text FROM tenants ORDER BY is_hq DESC, listeners DESC`;
  const c360 = tenants.filter((t) => t.system === 'c360');
  const audSum = tenants.reduce((a, t) => a + Number(t.listeners), 0);

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Rede Metropolitana — a 98.5 é a matriz</b> e controla todas as afiliadas. Hoje elas usam o Pulsar isolado; a
        Central 360 unifica programação, comercial e dados de toda a rede num só lugar. Clique numa praça (mapa ou card) para abrir o painel.
      </Hint>
      <div className="cards g4" style={{ marginBottom: 8 }}>
        <Kpi label="Afiliadas" value={String(tenants.length)} delta="14 estados" />
        <Kpi label="No ar agora" value={String(tenants.length - 1)} delta="1 em manutenção" deltaTone="down" tone="b2" />
        <Kpi label="Migradas p/ Central 360" value={String(c360.length)} delta="meta: todas até dez" deltaTone="up" tone="y" />
        <Kpi label="Audiência somada" value={fmtK(audSum)} delta="ouvintes/dia" deltaTone="up" tone="r" />
      </div>

      <SecTitle right={session.role === 'admin' ? (
        <QuickAdd
          label="+ Nova afiliada"
          title="Nova afiliada da rede"
          endpoint="/api/tenants"
          small
          fields={[
            { key: 'city', label: 'Cidade' },
            { key: 'uf', label: 'UF' },
            { key: 'freq', label: 'Frequência (ex.: 97.3)' },
          ]}
          successMsg="Afiliada criada — entra no mapa em fase 1 (Diagnóstico)."
        />
      ) : <span className="tiny muted">visão da rede</span>}>
        Mapa da rede — Brasil
      </SecTitle>
      <Card style={{ marginBottom: 16 }}>
        <RedeInterativa tenants={tenants as never} />
      </Card>

      <SecTitle>Cobertura nacional</SecTitle>
      <Card pad0 style={{ marginBottom: 16 }}>
        <table>
          <thead><tr><th>Praça</th><th>Ouvintes</th><th>Receita</th><th>Sistema</th><th>Fase migração</th></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="b">{t.is_hq ? 'Matriz 98.5 SP' : `${t.city} ${t.freq}`}</td>
                <td>{fmtK(Number(t.listeners))}</td>
                <td>{Number(t.revenue_month) > 0 ? `R$ ${Math.round(Number(t.revenue_month) / 1000)}k` : '—'}</td>
                <td>
                  {t.system === 'c360' ? <Chip tone={t.is_hq ? 'blue' : 'green'}>360</Chip>
                    : t.system === 'migrando' ? <Chip tone="amber">migrando</Chip>
                    : <Chip tone="gray">Pulsar</Chip>}
                </td>
                <td style={{ minWidth: 140 }}>
                  <div className="tiny muted">{FASES[t.migration_phase]}</div>
                  <Bar pct={(t.migration_phase / 6) * 100} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SecTitle right={<span className="tiny muted">o Pulsar não expõe API → coexistência + conector local</span>}>
        Migração Pulsar → Central 360
      </SecTitle>
      <Hint tone="y" style={{ marginBottom: 16 }}>
        <b>Estratégia:</b> consumir os dados do Pulsar por <b>conector local</b> (banco/export/log) e rodar os dois{' '}
        <b>em paralelo</b>. O 360 vira a fonte de BI e comercial primeiro; o playout só migra depois de validado. Zero risco de sair do ar.
      </Hint>
      <Card style={{ marginBottom: 16 }}>
        <div className="steps">
          {FASES.slice(1).map((f, i) => (
            <span key={f} style={{ display: 'contents' }}>
              <div className={`step ${i < 2 ? 'done' : i === 2 ? 'now' : ''}`}>
                <span className="n">{i < 2 ? '✓' : i + 1}</span> {i + 1}. {f}
              </div>
              {i < 5 && <span className="arrow">→</span>}
            </span>
          ))}
        </div>
      </Card>
      <Card title="Como entram os dados (conector local)">
        <div className="check"><span className="box">✓</span> Export do acervo (músicas, intérpretes, categorias)</div>
        <div className="check"><span className="box">✓</span> Grade e restrições (dia×hora) importadas</div>
        <div className="check off"><span className="box">✓</span> Log de execução sincronizado por arquivo</div>
        <div className="check off"><span className="box">✓</span> Leitura do banco local (quando houver acesso)</div>
        <Hint style={{ marginTop: 12 }}>
          Se o diagnóstico achar exportação/DB acessível, a ingestão é automatizada via <code>POST /api/v1/ingest</code>; senão, importação assistida.
        </Hint>
      </Card>
    </section>
  );
}
