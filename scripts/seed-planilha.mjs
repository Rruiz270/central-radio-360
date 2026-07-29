/* Preenche o PO da campanha demo no formato PROMOONE (rubricas) e abre o CP. */
import postgres from 'postgres';
import { readFileSync } from 'fs';
const url = process.env.DATABASE_URL || readFileSync('.env.local','utf8').match(/DATABASE_URL=(.+)/)[1].trim().replace(/^"|"$/g,'');
const sql = postgres(url, { prepare:false, max:1, connect_timeout:25 });

const [po] = await sql`SELECT id, code FROM purchase_orders WHERE kind='PO' ORDER BY id LIMIT 1`;
const [{ n }] = await sql`SELECT count(*)::int n FROM po_items WHERE po_id=${po.id} AND rubrica <> 'operacao'`;
if (n > 0) { console.log('planilha já preenchida'); await sql.end(); process.exit(0); }

await sql`DELETE FROM po_items WHERE po_id = ${po.id}`;
await sql`UPDATE purchase_orders SET project='Ativação Verão — Smirnoff', event_place='Litoral SP · 4 praças',
          event_date='2026-09-12' WHERE id=${po.id}`;

/* rubrica, item, fornecedor, pagto direto, custo unit, qtde, período, markup, valor unit cliente */
const L = [
  ['criacao','Planejamento + Criação','PROMOONE',false,18000,1,1,0,22000],
  ['espaco','Locação de área — Praia Grande','Prefeitura PG',true,4200,3,1,0.10,4620],
  ['espaco','Locação de área — Guarujá','Prefeitura Guarujá',true,3800,3,1,0.10,4180],
  ['cenografia','Tenda 3×3 personalizada','Cenotec',true,2400,4,1,0.15,2760],
  ['cenografia','Van plotada (adesivagem)','Plotcar Frotas',true,14800,1,1,0.12,16576],
  ['tecnica','Som e caixas ativas','Áudio Rental SP',true,2100,4,1,0.12,2352],
  ['tecnica','Gerador + operador','GeraTec',true,890,12,1,0.12,997],
  ['operacao','Equipe de promotores (diária)','Vibe Promo Staff',true,280,8,12,0.15,322],
  ['operacao','Alimentação e deslocamento','reembolso interno',false,1450,12,1,0,1450],
  ['equipe','Líder de equipe','Vibe Promo Staff',true,420,1,12,0.15,483],
  ['equipe','Uniformes personalizados','Brandwear',true,189,24,1,0.20,227],
  ['taxas','Seguro de evento','Porto Seguro',true,3100,1,1,0.05,3255],
  ['taxas','Brindes (kit copo + squeeze)','Prime Brindes',true,11.9,6000,1,0.18,14.04],
];
let pos = 0;
for (const [rub,item,forn,direto,cu,q,per,mk,cl] of L) {
  await sql`INSERT INTO po_items (po_id,pos,rubrica,item,supplier,direct_pay,unit_price,qty,period,markup,
                                  client_unit,client_qty,client_period,payment)
            VALUES (${po.id},${pos++},${rub},${item},${forn},${direto},${cu},${q},${per},${mk},
                    ${cl},${q},${per},'30 dd')`;
}
const [t] = await sql`SELECT COALESCE(sum(qty*period*unit_price),0) c,
                             COALESCE(sum(client_unit*client_qty*client_period),0) f
                      FROM po_items WHERE po_id=${po.id}`;
console.log(`✓ ${po.code}: ${L.length} linhas em 7 rubricas · custo R$ ${Number(t.c).toLocaleString('pt-BR')} · cliente R$ ${Number(t.f).toLocaleString('pt-BR')}`);
await sql.end();
