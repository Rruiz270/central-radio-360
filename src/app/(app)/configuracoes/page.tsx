import { sql } from '@/lib/db';
import { requireModule } from '@/lib/guard';
import { SecTitle, Hint, Card, Chip } from '@/components/ui';
import { Tabs } from '@/components/Tabs';
import { SettingsForm } from '@/components/SettingsForm';
import { UsersAdmin } from '@/components/UsersAdmin';
import { Importers } from '@/components/Importers';
import { SystemPanel } from '@/components/SystemPanel';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const session = await requireModule('config');
  const isAdmin = session.role === 'admin';
  const [tenants, runs] = await Promise.all([
    sql`SELECT slug, name FROM tenants ORDER BY is_hq DESC, name`,
    sql`SELECT * FROM cron_runs ORDER BY ran_at DESC LIMIT 8`,
  ]);

  if (!isAdmin) {
    return (
      <section className="view on">
        <Hint tone="y">Somente a Administração (Matriz) gerencia integrações, usuários e importadores.</Hint>
      </section>
    );
  }

  return (
    <section className="view on">
      <Tabs
        tabs={[
          {
            id: 'integ', label: 'Integrações & Chaves',
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  Cole aqui as chaves das APIs (IA, WhatsApp, redes sociais, CRM i10). Ficam no banco, mascaradas na
                  leitura, e valem na hora — sem redeploy.
                </Hint>
                <SettingsForm />
                <SecTitle>Ordem de prioridade das credenciais (destravam o resto)</SecTitle>
                <Card pad0>
                  <table>
                    <thead><tr><th>#</th><th>Credencial</th><th>Uso</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr><td>1</td><td className="b">WhatsApp Business (WABA + token)</td><td>Alertas por área, cobrança, radar</td><td><Chip tone="amber">pendente</Chip></td></tr>
                      <tr><td>2</td><td className="b">Chaves Claude / OpenAI</td><td>Posts, imagens e copilots por IA</td><td><Chip tone="amber">colar acima</Chip></td></tr>
                      <tr><td>3</td><td className="b">OAuth Meta / YouTube / TikTok</td><td>Publicação automática + monetização</td><td><Chip tone="amber">app review</Chip></td></tr>
                      <tr><td>4</td><td className="b">Certificado digital + agregador NFS-e</td><td>Emissão fiscal real</td><td><Chip tone="gray">providenciar</Chip></td></tr>
                      <tr><td>5</td><td className="b">Chaves Omie / Vindi / Pagar.me</td><td>Conciliação → aging automático</td><td><Chip tone="green">equipe já domina</Chip></td></tr>
                      <tr><td>6</td><td className="b">Contrato Kantar (por praça)</td><td>Audiência oficial no Concorrência</td><td><Chip tone="gray">comercial</Chip></td></tr>
                    </tbody>
                  </table>
                </Card>
              </>
            ),
          },
          {
            id: 'users', label: 'Usuários & 2FA',
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  Crie os acessos reais da equipe (senha individual, mín. 8 caracteres) e desative os logins de
                  demonstração quando o time entrar. 2FA por app autenticador, recomendado para Administração e Financeiro.
                </Hint>
                <Card><UsersAdmin tenants={tenants as never} myId={session.uid} /></Card>
              </>
            ),
          },
          {
            id: 'import', label: 'Importadores CSV',
            content: (
              <>
                <Hint style={{ marginBottom: 16 }}>
                  Carga de dados reais da operação: exporte da planilha atual em CSV e importe aqui. Aceita vírgula ou
                  ponto-e-vírgula; a 1ª linha é o cabeçalho.
                </Hint>
                <Card><Importers /></Card>
              </>
            ),
          },
          {
            id: 'sys', label: 'Sistema (crons, conector, backup)',
            content: <SystemPanel runs={runs as never} />,
          },
        ]}
      />
    </section>
  );
}
