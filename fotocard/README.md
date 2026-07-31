# Fotocard — Extreme Wind Blade Services

App PWA para registro fotográfico de inspeção e reparo de pás eólicas.

## Arquivos

| Arquivo | Função |
|---------|--------|
| `index.html` | App principal (câmera + fotocard + salvar) |
| `sw.js` | Service Worker — habilita uso **offline** |
| `manifest.json` | Metadados PWA (ícone, nome, tela cheia) |
| `icon-192.png` | Ícone para celulares |
| `icon-512.png` | Ícone de alta resolução |
| `.nojekyll` | Desativa Jekyll no GitHub Pages |

## Deploy no GitHub Pages

### Passo a passo

1. Crie um repositório no GitHub (ex: `fotocard` ou `ew-fotocard`)
2. Faça upload de **todos** os arquivos desta pasta
3. Vá em **Settings → Pages**
4. Em "Source", selecione **Branch: main** e pasta **/ (root)**
5. Clique em **Save**
6. URL gerada: `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

### Primeiro acesso (obrigatório)
- Abra a URL **com internet** no celular de campo
- O app será cacheado automaticamente
- A partir daí funciona **sem internet**

## Como funciona offline

```
Primeira visita (com internet)
  └─ Service Worker instala e cacheia:
       ├─ index.html
       ├─ sw.js
       ├─ manifest.json
       └─ html2canvas (CDN)

Visitas seguintes (com ou sem internet)
  └─ SW serve do cache local
       └─ Câmera funciona (contexto HTTPS preservado)
            └─ Foto salva na galeria do dispositivo
```

## Fluxo de uso no campo

1. Abra o app → preencha os dados do fotocard
2. Toque **📷 Abrir Câmera com Fotocard**
3. Posicione a câmera → o fotocard aparece no canto superior direito
4. Toque o botão de captura → foto composta é salva na galeria
5. Ou use **💾 Salvar Fotocard** para exportar só o card

## "Adicionar à tela inicial"

No celular:
- **Android Chrome**: Menu (⋮) → *Adicionar à tela inicial*
- **iOS Safari**: Compartilhar (□↑) → *Adicionar à tela de início*

Após adicionar, o app abre em tela cheia como um aplicativo nativo.
