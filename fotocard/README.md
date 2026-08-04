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
       ├─ index.html   (app inteiro: card vetorial + câmera, sem bibliotecas)
       ├─ sw.js
       └─ manifest.json

Visitas seguintes (com ou sem internet)
  └─ SW serve do cache local
       └─ Câmera funciona (contexto HTTPS preservado)
            └─ Foto salva na galeria do dispositivo
```

## Fotocard vetorial (Canvas 2D)

O card não é uma captura de tela de um bloco HTML: ele é **desenhado**
com o Canvas 2D nativo do navegador (módulo `FC` dentro do `index.html`).

- **Nítido em qualquer resolução** — o vetor é rasterizado só no tamanho
  final da foto, não redimensionado depois.
- **Transparência real** — sobre a foto o fundo do card sai com opacidade
  **0,7**, então a pá continua visível atrás dele; texto, linhas e caixas de
  seleção ficam 100% opacos, sem perder leitura. Para deixar mais discreto,
  altere `OPACITY` no topo do módulo `FC` para `0.5`.
- **O que aparece na tela é o que grava** — pré-visualização, overlay ao vivo
  e foto usam o mesmo desenho.
- **Sem biblioteca externa** — dispensa o `html2canvas` (198 KB), então o
  modo offline fica mais leve.
- `💾 Salvar Fotocard (sem foto)` exporta o card **opaco** em 3× (~1380 px de
  largura), para colar em relatório.

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
