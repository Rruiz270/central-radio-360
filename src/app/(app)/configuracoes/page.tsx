import { requireModule } from '@/lib/guard';
import { SecTitle, Hint, Card, Chip } from '@/components/ui';
import { SettingsForm } from '@/components/SettingsForm';

export default async function ConfigPage() {
  const session = await requireModule('config');
  const isAdmin = session.role === 'admin';

  return (
    <section className="view on">
      <Hint style={{ marginBottom: 16 }}>
        <b>Integrações do Central 360</b> — cole aqui as chaves das APIs (IA, WhatsApp, redes sociais, CRM i10). As chaves
        ficam no banco, mascaradas na leitura, e valem na hora — sem redeploy.
      </Hint>
      {isAdmin ? <SettingsForm /> : <Hint tone="y">Somente a Administração (Matriz) gerencia as integrações.</Hint>}

      <SecTitle>Ordem de prioridade das credenciais (destravam o resto)</SecTitle>
      <Card pad0>
        <table>
          <thead><tr><th>#</th><th>Credencial</th><th>Uso</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>1</td><td className="b">WhatsApp Business (WABA + token)</td><td>Alertas por área, cobrança, radar</td><td><Chip tone="amber">pendente</Chip></td></tr>
            <tr><td>2</td><td className="b">OAuth Meta / YouTube</td><td>Central de Marketing + monetização</td><td><Chip tone="amber">app review</Chip></td></tr>
            <tr><td>3</td><td className="b">Chaves Omie / Vindi / Pagar.me</td><td>Conciliação financeira</td><td><Chip tone="green">equipe já domina</Chip></td></tr>
            <tr><td>4</td><td className="b">Certificado digital NFS-e</td><td>Emissão de faturas em lote</td><td><Chip tone="gray">providenciar</Chip></td></tr>
            <tr><td>5</td><td className="b">Contrato Kantar (por praça)</td><td>Audiência oficial p/ negociação</td><td><Chip tone="gray">comercial</Chip></td></tr>
            <tr><td>6</td><td className="b">Autorização de voz do locutor</td><td>Locução IA da madrugada</td><td><Chip tone="gray">jurídico</Chip></td></tr>
          </tbody>
        </table>
      </Card>
    </section>
  );
}
