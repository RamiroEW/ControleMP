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
  **0,85**; texto, linhas e caixas de seleção ficam 100% opacos.
- **O que aparece na tela é o que grava** — pré-visualização, overlay ao vivo
  e foto usam o mesmo desenho.
- **Sem biblioteca externa** — dispensa o `html2canvas` (198 KB), então o
  modo offline fica mais leve.
- `💾 Salvar Fotocard (sem foto)` exporta o card **opaco** em 4× (1840 px de
  largura), para colar em relatório.

### Ajuste manual na tela da câmera

**Tamanho** — de **20% a 70%** do lado menor da foto: slider, botões **−** / **+**
(passo de 2%) ou **pinça de dois dedos** em cima da imagem.

**Posição** — **arraste o card com um dedo** para onde quiser: qualquer canto,
meio, em cima do céu, longe do dano. O arraste só começa se o dedo encostar no
card, então segurar o celular não sai movendo nada; e tocar nos botões ou no
slider também não arrasta.

**Voltar ao padrão** — toque no valor (38%, canto superior direito).

A posição é guardada como **fração do espaço livre** (0 a 1 em cada eixo), não
em pixels. Por isso a mesma posição vale na tela e na foto, em qualquer
resolução e nas duas orientações: canto na tela = canto na foto, meio = meio.

O rótulo mostra `38% · 821 px`: a porcentagem e a **largura real que o card vai
ter na foto**. Como o card é vetorial, ele é *redesenhado* nesse tamanho — não
esticado. Em foto de 4K, 20% dá 432 px e 70% dá 1512 px, os dois igualmente
nítidos; o que muda é só o quanto ele cobre da pá.

O overlay ao vivo mostra o card no tamanho real que ele terá na foto (converte
pela escala do `object-fit:cover` do vídeo), então o ajuste é visual — não
precisa tirar a foto para conferir. Tamanho e posição ficam guardados no
aparelho (`localStorage`), então só precisam ser ajustados uma vez.

Quando o tamanho é escolhido à mão, o piso `MINW` sai de cena: a escolha da
pessoa manda, mesmo que deixe o card pequeno. O "voltar ao padrão" devolve o
modo automático.

### Constantes de ajuste (topo do módulo `FC`, no `index.html`)

| Constante | Valor | O que faz |
|---|---|---|
| `OPACITY` | `0.85` | opacidade do fundo do card sobre a foto |
| `FRAC0` | `0.38` | padrão: largura do card = 38% do lado **menor** da foto |
| `MARGIN` | `0.01` | folga até o canto superior direito |
| `MINW` | `400` | largura mínima do card em foto de baixa resolução |

Chaves gravadas no aparelho: `ew_card_frac` (tamanho) e `ew_card_pos`
(posição, `x,y` de 0 a 1).

Os três valores vieram do fotocard de referência usado em campo. Usar o lado
menor (e não a largura) mantém a mesma presença em foto em pé ou deitada.

## Resolução da foto

A câmera é aberta pedindo **3840×2160 (4K)**; se o aparelho não tiver, o
navegador cai sozinho na resolução mais próxima. Ao abrir a câmera o app
mostra num aviso rápido a resolução real entregue — é o que diz se a foto
vai aguentar zoom:

| Foto | Card na foto | Rótulos do card |
|---|---|---|
| 1280×720 | 360 px | 5,5 px |
| 1920×1080 | 410 px | 6,2 px |
| 3840×2160 | 821 px | 12,5 px |
| 4032×3024 (12 MP) | 1149 px | 17,5 px |
| 8000×6000 (48 MP) | 2280 px | 34,7 px |

Antes a foto era travada em 1280×720 e o card saía com 384 px — rótulos de
5,8 px, ilegíveis ao ampliar. O piso `MINW` (400 px, limitado a metade do lado
menor) garante que num aparelho sem 4K o card não fique menor do que era.

O JPEG é salvo com qualidade 0,92 (em 4K dá arquivo ~3× menor que 1,0, sem
diferença visível no texto do card).

O logo embutido tem 635×301 (2× a versão anterior), com o mesmo
enquadramento — não perde definição nem em foto de 12 MP.

## Fluxo de uso no campo

1. Abra o app → preencha os dados do fotocard
2. Toque **📷 Abrir Câmera com Fotocard**
3. Posicione a câmera → o fotocard aparece no canto superior direito
4. Se precisar, ajuste o card: **arraste com o dedo** para mudar de lugar,
   **pinça ou slider** para o tamanho — só na primeira vez, o app lembra
5. Toque o botão de captura → foto composta é salva na galeria
6. Ou use **💾 Salvar Fotocard** para exportar só o card

## "Adicionar à tela inicial"

No celular:
- **Android Chrome**: Menu (⋮) → *Adicionar à tela inicial*
- **iOS Safari**: Compartilhar (□↑) → *Adicionar à tela de início*

Após adicionar, o app abre em tela cheia como um aplicativo nativo.
