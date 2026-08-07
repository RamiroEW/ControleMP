# EW Dropbox Proxy (Cloudflare Worker)

Proxy que recebe a foto do app **Fotocard** e sobe no **Dropbox** repassando os
bytes originais — **sem reprocessar, sem perda de qualidade**.

Os segredos do Dropbox ficam **só no Worker** (nunca no front-end nem no
repositório público). O pior caso de abuso é alguém subir arquivos na sua
**App Folder** (pasta isolada) — não dá para ler, listar nem apagar nada.

---

## Pré-requisitos

- Conta no [Cloudflare](https://dash.cloudflare.com/sign-up) (plano grátis serve).
- Conta no [Dropbox](https://www.dropbox.com/developers/apps).
- [Node.js](https://nodejs.org) instalado.
- Wrangler (CLI do Cloudflare):
  ```bash
  npm install
  ```
  (usa o `wrangler` das devDependencies; ou instale global com `npm i -g wrangler`)

---

## 1. Criar o app no Dropbox

1. Vá em <https://www.dropbox.com/developers/apps> → **Create app**.
2. Escolha:
   - **Scoped access**
   - **App folder** (acesso só a uma pasta isolada — mais seguro)
   - Dê um nome (ex: `extreme-wind-fotos`).
3. Aba **Permissions** → marque **`files.content.write`** → **Submit**.
4. Aba **Settings** → anote **App key** e **App secret**.

## 2. Gerar o refresh token (uma vez)

1. Abra no navegador (troque `APP_KEY`):
   ```
   https://www.dropbox.com/oauth2/authorize?client_id=APP_KEY&token_access_type=offline&response_type=code
   ```
2. Aprove. O Dropbox mostra um **código de autorização** — copie.
3. Troque o código pelo refresh token (troque `CODE`, `APP_KEY`, `APP_SECRET`):
   ```bash
   curl https://api.dropbox.com/oauth2/token \
     -d code=CODE \
     -d grant_type=authorization_code \
     -u APP_KEY:APP_SECRET
   ```
4. Na resposta JSON, copie o valor de **`refresh_token`**. Ele não expira.

## 3. Gerar o APP_TOKEN (segredo app↔worker)

Um segredo aleatório que o app envia a cada requisição (barra abuso casual):
```bash
openssl rand -hex 24
```
Guarde esse valor — você vai colar nele no Worker **e** no app.

## 4. Configurar a origem permitida

Edite `wrangler.toml` e troque `ALLOWED_ORIGIN` pela URL do seu app no GitHub
Pages, ex:
```toml
ALLOWED_ORIGIN = "https://seu-usuario.github.io"
```

## 5. Definir os segredos no Worker

```bash
wrangler secret put DROPBOX_APP_KEY
wrangler secret put DROPBOX_APP_SECRET
wrangler secret put DROPBOX_REFRESH_TOKEN
wrangler secret put APP_TOKEN
```
(cada comando pergunta o valor e grava criptografado na Cloudflare)

## 6. Publicar

```bash
wrangler deploy
```
Anote a URL final, algo como:
`https://ew-dropbox-proxy.SEU-SUBDOMINIO.workers.dev`

## 7. Testar a conexão

```bash
curl https://ew-dropbox-proxy.SEU-SUBDOMINIO.workers.dev/ping \
  -H "X-EW-Token: SEU_APP_TOKEN" \
  -H "Origin: https://seu-usuario.github.io"
```
Esperado: `{"ok":true,"msg":"conexão OK"}`

## 8. Ligar no app

No **Fotocard**, abra **⚙️ Dropbox**, cole a **URL do Worker** e o **APP_TOKEN**,
salve e toque em **Testar**. A partir daí, cada foto salva vai também para o
Dropbox em `/<Cliente>/<Parque>/<Torre>/EW_....jpg`.

> Se você usar um **domínio próprio** no Worker (em vez de `*.workers.dev`),
> edite o `connect-src` do CSP em `fotocard/index.html` para incluí-lo.

---

## Testar localmente (opcional)

```bash
cp .dev.vars.example .dev.vars   # preencha os valores
wrangler dev
```

## Modelo de segurança (resumo)

- Segredos do Dropbox **só no Worker** (nunca expostos).
- App com escopo **App Folder**: acesso limitado a uma pasta; sem leitura/exclusão.
- **Origin allowlist** + **APP_TOKEN** + **limite de tamanho** (`MAX_MB`).
- Upload usa `mode:add` + `autorename` → nunca sobrescreve foto existente.
- Melhoria futura: fila offline (IndexedDB) e rotação periódica do `APP_TOKEN`.
