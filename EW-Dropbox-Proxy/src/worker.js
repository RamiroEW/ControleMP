/* ─────────────────────────────────────────────────────────────
   EW Dropbox Proxy — Cloudflare Worker
   Recebe a foto do app (fotocard) e sobe no Dropbox SEM reprocessar
   (repassa os bytes originais → nenhuma perda de qualidade).

   SEGREDOS (nunca no front-end / nunca no repositório):
     DROPBOX_APP_KEY        — App key do app Dropbox (scoped, App Folder)
     DROPBOX_APP_SECRET     — App secret
     DROPBOX_REFRESH_TOKEN  — refresh token (offline) gerado 1x
     APP_TOKEN              — segredo compartilhado app↔worker (anti-abuso)
   VARIÁVEIS (wrangler.toml [vars], não são segredo):
     ALLOWED_ORIGIN         — origem(ns) permitida(s), separadas por vírgula
                              ex: https://usuario.github.io
     MAX_MB                 — tamanho máximo por foto (padrão 30)

   Rotas:
     OPTIONS *      → preflight CORS
     GET  /ping     → teste de conexão (valida token e credenciais)
     POST /upload   → sobe a foto (corpo = bytes; cabeçalho X-EW-Path = destino)
   ───────────────────────────────────────────────────────────── */

// cache do access token no isolate (best-effort, ~4h de validade)
let TOKEN_CACHE = { token: null, exp: 0 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // bloqueia origem não autorizada (defesa de navegador; some via CORS)
    if (origin && !originPermitida(origin, env)) {
      return json({ error: 'origem_nao_autorizada' }, 403, cors);
    }

    // autenticação por token compartilhado
    const token = request.headers.get('X-EW-Token') || '';
    if (!env.APP_TOKEN || token !== env.APP_TOKEN) {
      return json({ error: 'nao_autorizado' }, 401, cors);
    }

    try {
      if (url.pathname === '/ping' && request.method === 'GET') {
        const access = await getAccessToken(env);   // valida credenciais Dropbox
        let conta = null;
        try {
          const r = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + access }
          });
          if (r.ok) { const d = await r.json(); conta = (d.email || null); }
        } catch { /* não crítico: /ping continua ok mesmo sem essa info */ }
        console.log('ping_ok conta=' + conta);
        return json({ ok: true, msg: 'conexão OK', conta_dropbox: conta }, 200, cors);
      }

      if (url.pathname === '/upload' && request.method === 'POST') {
        return await handleUpload(request, env, cors);
      }

      return json({ error: 'rota_desconhecida' }, 404, cors);
    } catch (e) {
      return json({ error: 'falha_interna', detalhe: String(e && e.message || e) }, 502, cors);
    }
  }
};

async function handleUpload(request, env, cors) {
  const maxMB = Number(env.MAX_MB || 30);
  const rawPath = request.headers.get('X-EW-Path') || '';
  let destino;
  try { destino = sanitizePath(decodeURIComponent(rawPath)); }
  catch { return json({ error: 'caminho_invalido' }, 400, cors); }
  if (!destino || destino === '/') return json({ error: 'caminho_ausente' }, 400, cors);

  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ error: 'corpo_vazio' }, 400, cors);
  if (buf.byteLength > maxMB * 1024 * 1024) {
    return json({ error: 'arquivo_grande', max_mb: maxMB }, 413, cors);
  }

  const access = await getAccessToken(env);
  const arg = {
    path: destino,
    mode: 'add',            // nunca sobrescreve
    autorename: true,       // se já existir, cria "(1)"
    mute: true,
    strict_conflict: false
  };

  const resp = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + access,
      'Dropbox-API-Arg': httpHeaderSafeJson(arg),
      'Content-Type': 'application/octet-stream'
    },
    body: buf
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.log('upload_falhou', resp.status, txt);
    return json({ error: 'dropbox_upload_falhou', status: resp.status, detalhe: txt }, 502, cors);
  }
  const data = await resp.json();
  // log explícito: mostra no "wrangler tail" onde o Dropbox confirmou ter gravado o arquivo
  console.log('upload_ok path_display=' + data.path_display + ' id=' + data.id + ' size=' + data.size);
  return json({ ok: true, path_display: data.path_display, id: data.id, size: data.size }, 200, cors);
}

/* ── OAuth: troca refresh token por access token (cacheado) ── */
async function getAccessToken(env) {
  const agora = Date.now();
  if (TOKEN_CACHE.token && agora < TOKEN_CACHE.exp) return TOKEN_CACHE.token;

  const basic = btoa(env.DROPBOX_APP_KEY + ':' + env.DROPBOX_APP_SECRET);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.DROPBOX_REFRESH_TOKEN
  });
  const r = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error('refresh_token_falhou: ' + r.status + ' ' + await r.text());
  const d = await r.json();
  TOKEN_CACHE = { token: d.access_token, exp: agora + (d.expires_in - 300) * 1000 };
  return TOKEN_CACHE.token;
}

/* ── util ── */
function originPermitida(origin, env) {
  const lista = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  return lista.length === 0 || lista.includes(origin);
}
function corsHeaders(origin, env) {
  const permitida = origin && originPermitida(origin, env);
  const fallback = (env.ALLOWED_ORIGIN || '').split(',')[0].trim() || '*';
  return {
    'Access-Control-Allow-Origin': permitida ? origin : fallback,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-EW-Token, X-EW-Path',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors }
  });
}
// impede path traversal e garante caminho absoluto dentro da App Folder
function sanitizePath(p) {
  if (!p) return '';
  p = p.replace(/\\/g, '/');
  const partes = p.split('/').map(s => s.trim())
    .filter(s => s && s !== '.' && s !== '..')
    .map(s => s.replace(/[:*?"<>|]/g, '-'));
  return '/' + partes.join('/');
}
// Dropbox-API-Arg exige JSON com todo caractere não-ASCII escapado como \uXXXX
function httpHeaderSafeJson(obj) {
  return JSON.stringify(obj).replace(/[-￿]/g, c =>
    '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
}
