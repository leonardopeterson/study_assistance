# Assistance

Aplicativo pessoal, single-user, para rotina e estudos. Next.js + TypeScript + Tailwind CSS + shadcn/ui, Neon PostgreSQL + Drizzle, Auth.js com Google OAuth, Google Calendar e Drive, Recharts. Sem IA e sem serviços adicionais.

## Estado desta entrega

- Interface responsiva em português: Geral, Estudos, Estatísticas e Calendário.
- Cadastro, edição, exclusão e estados de tarefas, atividades, compromissos, lembretes, matérias, conteúdos, provas, entregas, sessões, simulados e programação semanal.
- Prioridade baixa/média/alta; atrasos calculados sem alterar o estado armazenado.
- Navegação por dia, busca, progresso diário e dos últimos sete dias, próximos prazos.
- Timer persistente neste navegador, com pausa, retomada e gravação idempotente de sessões no banco. Tempo acumulado pode ser recuperado ao recarregar; o timer ativo não é sincronizado entre dispositivos. Sessões salvas são sincronizadas via banco.
- Estatísticas sem dados fictícios: minutos por dia, conclusões, desempenho e tempo por matéria.
- Login Google restrito a **leonardopeterson17@gmail.com**. Nenhum outro provedor de login.
- Integração Calendar bidirecional **manual**, por compromisso escolhido: enviar ao Google, importar alteração e desvincular. Tarefas nunca são enviadas automaticamente. Alterações no Google são verificadas por ETag para evitar sobrescrita silenciosa. Não há cron, webhooks nem sincronização em segundo plano.
- Materiais enviados diretamente ao Google Drive, até 3 MB por upload para respeitar os limites de requisição da hospedagem. Arquivos maiores podem ser vinculados por ID se já tiverem sido autorizados ao app. O escopo `drive.file` não dá acesso geral a arquivos pré-existentes; uma integração com Google Picker para selecionar qualquer arquivo autorizado é uma melhoria futura. A primeira versão permite upload de arquivos novos e vínculo de arquivos já acessíveis ao app.

**Ainda depende de você:** criar o cliente OAuth Google e preencher ID/secret. O login e as integrações reais não podem ser concluídos ou testados sem essas credenciais. A publicação na Vercel está pendente dessa configuração e de um repositório remoto.

## Neon preparado

Foi reaproveitado o projeto **Study Assistance**, ID `crimson-star-43014260`, plano Free, região São Paulo. Criamos a branch **assistance-mvp**, ID `br-fragrant-cake-acgybzkb`, a partir da production. As branches antigas não foram alteradas.

A migração Drizzle foi aplicada nessa nova branch e criou o schema `assistance` com as tabelas `entries` e `google_credentials`. O schema `drizzle` contém o histórico das migrações. A conexão foi salva apenas em `.env.local`, ignorado pelo Git.

O banco guarda registros do aplicativo e tokens Google criptografados com AES-256-GCM. Arquivos binários ficam no Drive. Trocar `AUTH_SECRET` invalida sessões e a chave dos tokens Google; nesse caso, será necessário reconectar o Google. Não altere essa chave rotineiramente.

## Rodar localmente

Use Node.js 24 LTS ou uma versão compatível com Next.js 16 (mínimo 20.9) e npm.

No Windows desta máquina, use `npm.cmd` se o comando `npm` no PowerShell apresentar erro de caminho. Exemplo: `npm.cmd run dev`.

```powershell
cd "CAMINHO_DO_PROJETO"
npm ci
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

O arquivo `.env.local` desta máquina já tem a conexão Neon, `AUTH_SECRET` e o e-mail autorizado. Preencha somente `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` após criar o cliente abaixo. Reinicie o servidor depois de alterar o arquivo.

Sem OAuth, o modo de desenvolvimento apresenta uma **prévia local** funcional: os dados ficam no navegador e não vão para o Neon. Materiais e Calendar exigem conexão real. Dados da prévia não são importados automaticamente ao ativar o login. Em produção, a falta de configuração bloqueia a interface e mostra uma mensagem de configuração; não há entrada sem Google.

Em outra máquina, copie `.env.example` para `.env.local` e preencha os valores. Para gerar uma chave segura:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Não envie `.env.local` ao Git nem compartilhe seus segredos em mensagens.

## Configurar o Google OAuth

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie ou selecione um projeto. Não é necessário usar serviços pagos do Cloud para este app.
2. Ative **Google Calendar API** e **Google Drive API** em APIs e serviços.
3. Em **Google Auth Platform**, configure Branding, Audience e Data Access. Para uma conta Gmail pessoal, use público externo e inclua `leonardopeterson17@gmail.com` como usuário de teste enquanto o app estiver em Testing.
4. Registre os escopos de login (`openid`, `email`, `profile`) e os escopos de integração:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/drive.file`
5. Crie um cliente OAuth do tipo **Web application**. Adicione a URI de redirecionamento **exatamente** como usada no navegador:
   - `http://localhost:3000/api/auth/callback/google`
   - Para a prévia aberta por este trabalho: `http://127.0.0.1:3000/api/auth/callback/google`, caso vá usar esse endereço.
   - Depois do deploy: `https://SEU-APP.vercel.app/api/auth/callback/google`.
6. Preencha `.env.local` com o client ID em `AUTH_GOOGLE_ID` e o client secret em `AUTH_GOOGLE_SECRET`. Use `AUTH_URL` correspondente ao endereço escolhido e reinicie o servidor.
7. Entre com Google. O login inicialmente solicita apenas identidade. Em **Integrações**, autorize Calendar e Drive separadamente.

Apps externos em Testing podem receber refresh tokens com validade de sete dias para esses escopos. Se a autorização expirar, reconecte em Integrações. Consulte as regras atuais do Google antes de mudar o status de publicação do OAuth; publicar o app OAuth é diferente de publicar o site na Vercel.

## Publicar na Vercel Hobby

1. Crie um repositório Git com o conteúdo desta pasta. `.env.local`, `node_modules` e `.next` são ignorados.
2. Importe o repositório na sua conta **Vercel Hobby**. Framework: Next.js. Root Directory: a pasta que contém `package.json`.
3. Defina as variáveis do `.env.example` na Vercel. Copie `DATABASE_URL`, `AUTH_SECRET` e os dados OAuth diretamente do seu arquivo local, sem publicá-los. Configure `ALLOWED_EMAIL=leonardopeterson17@gmail.com` e `AUTH_URL=https://SEU-APP.vercel.app`.
4. Adicione a URI de callback dessa URL no Google Console.
5. Faça o deploy com o build padrão `npm run build`.
6. Verifique login, cadastre uma tarefa, recarregue a página e confira o mesmo dado no celular. Autorize as integrações, sincronize um compromisso de teste, altere-o no Google e use **Importar alteração**. Envie um PDF ao Drive e abra o material pelo app.

A migração inicial **já está aplicada** à branch preparada. Para alterações futuras, rode `npm run db:generate`, revise o SQL e teste numa branch Neon antes de `npm run db:migrate`. A configuração atual usa conexão direta para migrações e o driver HTTP do Neon para consultas.

O projeto foi construído para ficar dentro dos planos gratuitos: Vercel Hobby, Neon Free, Google APIs e o espaço já disponível na sua conta Drive. Isso não garante custo zero sem limites: acompanhe as cotas e os termos desses planos e não habilite serviços pagos ou upgrades. Nenhum domínio comprado ou serviço de IA é necessário.

## Verificações

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Os testes de navegador esperam o servidor de desenvolvimento já aberto em `http://127.0.0.1:3000`. Instale o navegador com `npx playwright install chromium` ou informe `TEST_BROWSER_PATH` para um Chromium de teste disponível. Os testes e2e usam contextos isolados e a prévia local.

Os testes de API reais ficam desativados por padrão. Para rodá-los, use uma **branch de desenvolvimento**, servidor já ativo e `.env.local` correspondente:

```powershell
$env:TEST_API="true"
npx tsx --test tests/api.test.ts
```

Eles criam uma sessão de teste assinada com a chave local para verificar autenticação, proteção de origem, validação, CRUD Neon e idempotência. Isso **não substitui um teste do fluxo OAuth no Google**. Os registros temporários são removidos ao terminar.

Nesta entrega passaram: 8 testes de domínio, 2 testes da API com Neon, 3 testes de navegador (desktop/mobile), 1 teste de interface de produção conectada ao Neon, TypeScript e build de produção. A auditoria das dependências de produção não apontou vulnerabilidades na data da verificação. Calendar, Drive e Google OAuth foram implementados com base nas APIs oficiais, mas a validação externa de ponta a ponta permanece pendente das credenciais.

O teste da interface conectada utiliza uma sessão de teste assinada localmente e credenciais OAuth fictícias apenas no processo de teste. Essas credenciais não são salvas no projeto e não permitem acesso ao Google. Todos os registros de teste no banco foram removidos.

## Organização

```text
src/app/                 páginas e API interna Next.js
src/auth.ts              Auth.js Google, restrição de conta e armazenamento de tokens
src/components/          interface e timer
src/components/ui/       componentes shadcn/ui
src/lib/domain.ts        validação e regras de progresso/atraso
src/lib/db/              schema Drizzle e conexão Neon
src/lib/google.ts        cliente Google e renovação de tokens
src/lib/crypto.ts        criptografia de credenciais
src/lib/repository.ts    acesso aos registros por proprietário
drizzle/                 migrações versionadas
tests/                   domínio, API e navegador
```

O MVP usa uma tabela de registros com dados JSON validados por Zod, adequada ao uso pessoal e aos tipos pequenos de registro. Vínculos com matérias são validados no servidor. Todo acesso ao banco e aos tokens acontece no servidor; a API exige a sessão Google e o proprietário autorizado.

## Referências oficiais

- [Next.js](https://nextjs.org/docs/app/getting-started/installation)
- [Auth.js Google](https://authjs.dev/getting-started/providers/google) e [renovação de tokens](https://authjs.dev/guides/refresh-token-rotation)
- [Google Calendar: versões e ETags](https://developers.google.com/calendar/api/guides/version-resources)
- [Google Drive: uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Google OAuth: validade dos tokens](https://developers.google.com/identity/protocols/oauth2#expiration)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
