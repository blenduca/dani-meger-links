/* ============================================================================
   Gerador dos fundos dos três banners — página de links MEGER.

   PORTADO de `dani-meger-plataforma/scripts/gerar-capas.mjs`, o gerador das
   capas de aula. Mesmo sistema, mesma paleta, mesmos primitivos (arco aberto,
   meio-tom serigráfico, grão). O que muda é o PAPEL da peça:

   · Na plataforma a capa é uma imagem fechada — a frase é desenhada DENTRO do
     SVG, e a arte reserva cabeceira e rodapé para ela.
   · Aqui a copy é HTML de verdade e continua sendo (esta página existe para ter
     texto no documento servido — ver o cabeçalho do estilo.css). Então estes
     arquivos são ARTE E SÓ: zero texto, zero cabeceira, zero rodapé. Quem
     protege a leitura é o véu em CSS, que já existia para as fotos.

   SISTEMA: ARCOS. Toda peça é uma arquitetura de arcos derivada da proporção
   do símbolo (186/213). Cada banner se diferencia por número de arcos, escala,
   e o que preenche a abertura — nunca por um ícone.

   ⚠️ NADA de textura embarcada e NADA de símbolo em base64. Na plataforma isso
   é barato (é uma imagem por aula, carregada sob demanda). Aqui é o primeiro
   paint de um link de bio que abre no navegador do Instagram: a textura sozinha
   pesa 107 KB e o símbolo em base64 levaria a capa 01 de 5 KB para 24 KB.
   Gradiente + meio-tom + grão dão a mesma família por ~6 KB — e é o que a
   maioria das capas da plataforma já usa (01, 02, 05, 07, 08, 09, 10, 13, 14).

   Uso:  node scripts/gerar-fundos.mjs
   ========================================================================== */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const saida = resolve(raiz, 'assets/fundos');
mkdirSync(saida, { recursive: true });

/* ---------------------------------------------------------------- paleta --
   Idêntica à da plataforma, conferida token a token contra
   `ds/tokens/colors.css` desta página (mesmos hex, mesma origem no deck). */
const C = {
  marrom: '#3E2B20',
  verde: '#4B5D45',
  dourado: '#B8863B',
  douradoClaro: '#DCC28C',
  creme: '#F3ECDD',
  // derivados: escurecimentos puros de marrom e verde, só para modelar
  // profundidade. Nenhum matiz novo entra na paleta.
  marromFundo: '#2A1D16',
  marromBreu: '#1C1310',
  verdeFundo: '#33402F',
};

/* ====================================================== vocabulário de forma */

/* Arco sem base — só o contorno da abertura, para bater no rodapé da peça.
   É o primitivo que a plataforma mais usa; o arco fechado não aparece aqui
   porque toda arcada destes três banners nasce da borda de baixo. */
function arcoAberto(x, y, w, h, k) {
  const rx = w / 2;
  const ry = Math.min(k, h);
  const yImposta = y + ry;
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${yImposta}`,
    `A ${rx} ${ry} 0 0 1 ${x + w} ${yImposta}`,
    `L ${x + w} ${y + h}`,
    'Z',
  ].join(' ');
}

/* Meio-tom serigráfico de verdade: três densidades de ponto, cada uma revelada
   por uma faixa do degradê. O ponto encolhe ao longo da direção — é o que
   distingue uma retícula impressa de um grid de bolinhas. */
function meioTom(id, cor, { x1 = '0%', y1 = '0%', x2 = '0%', y2 = '100%' } = {}) {
  const bandas = [
    { r: 1.5, stops: [[0, 1], [0.3, 1], [0.5, 0]] },
    { r: 1.0, stops: [[0.22, 0], [0.42, 1], [0.62, 1], [0.78, 0]] },
    { r: 0.55, stops: [[0.55, 0], [0.75, 1], [1, 1]] },
  ];
  const defs = bandas
    .map((b, i) => {
      const paradas = b.stops
        .map(([o, v]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${v}"/>`)
        .join('');
      return `<pattern id="${id}p${i}" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="${b.r}" fill="${cor}"/></pattern>
      <linearGradient id="${id}g${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${paradas}</linearGradient>
      <mask id="${id}m${i}"><rect x="-40" y="-40" width="3000" height="3000" fill="url(#${id}g${i})"/></mask>`;
    })
    .join('\n');
  const uso = (w, h, op = 1) =>
    bandas
      .map(
        (_, i) =>
          `<rect x="-20" y="-20" width="${w + 40}" height="${h + 40}" fill="url(#${id}p${i})" mask="url(#${id}m${i})" opacity="${op}"/>`,
      )
      .join('');
  return { defs, uso };
}

const grao = (w, h, op = 0.16) => `
  <filter id="grao" x="0%" y="0%" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/></filter>
  <rect width="${w}" height="${h}" filter="url(#grao)" opacity="${op}" style="mix-blend-mode:overlay"/>`;

/* ============================================================ composições ==
   Uma medida para os três: 800×440, deliberada.

   Os banners desta página variam de 656×343 (faixa dourada no desktop) a
   ~335×420 (herói no celular). Com `background-size: cover` numa arte 800×440,
   a escala resultante fica entre 0,95 e 1,11 nos dois extremos — ou seja, os
   arcos aparecem praticamente no tamanho em que foram desenhados em qualquer
   viewport, e o que muda é QUANTOS cabem. É por isso que as três composições
   são arcadas de largura corrida e ancoradas embaixo: cortar pelos lados tira
   arcos, não estraga a composição. Medido, não estimado. */
const W = 800;
const H = 440;

const fundos = [];
const fundo = (o) => fundos.push(o);

/* ------------------------------------------------------- 1 · HERÓI --------
   Papel: entrada de tráfego frio, o "descubra". É o mesmo papel da capa
   `01-boas-vindas` da plataforma, e por isso o mesmo gesto: halo + um vão
   central de luz. Chão verde (o bloco já era verde) como a capa 10.
   O vão é CENTRAL de propósito: `cover` corta pelos lados, e um foco
   descentrado sairia da peça no celular. */
fundo({
  id: 'fundo-heroi',
  arte: () => {
    const mt = meioTom('mt', C.douradoClaro, { x1: '100%', x2: '0%', y1: '0%', y2: '70%' });
    /* 🔴 A ARQUITETURA MORA NO TERÇO DE BAIXO, E ISSO É MEDIDA, NÃO GOSTO.
       Com `cover`, a razão de ALTURA é sempre a que manda nestes banners (a de
       largura só venceria se o bloco tivesse menos de 184px de altura, o que
       nunca acontece) — logo o eixo vertical da arte mapeia 1:1 no bloco: y%
       da arte = y% do banner, em qualquer viewport.
       Medido no navegador: a ação "Ver como funciona" cai entre 68% e 75% da
       altura do herói, e ela é CREME. Na primeira versão o vão começava em 22%
       e o texto media 2,75:1 — creme sobre o trecho claro do degradê, reprovado.
       A imposta desceu para 75%, que é onde começa o respiro de baixo do bloco
       (`padding-block` termina em --s-96): a arcada acende SÓ abaixo do
       conteúdo, e o que cruza o texto é verde com véu por cima.
       O halo também encolheu — era ele, e não o vão, que estava clareando a
       faixa do texto na segunda tentativa. */
    const imposta = 332;               // 75% de 440
    const n = 9;
    const lw = 62;
    const vao = 18;
    const total = n * lw + (n - 1) * vao;
    let x = (W - total) / 2;
    const arcada = [];
    for (let i = 0; i < n; i++) {
      const p = arcoAberto(x, imposta, lw, H - imposta, lw / 2);
      arcada.push(`<path d="${p}" fill="url(#vaoFundo)"/>
        <path d="${p}" fill="none" stroke="${C.douradoClaro}" stroke-opacity="0.3" stroke-width="1"/>`);
      x += lw + vao;
    }
    /* O vão principal NASCE na imposta, não acima dela: é ele, e não a arcada,
       que subia até 67% e derrubava o contraste da terceira ação para 4,36.
       Ganha presença pela LARGURA (é o dobro dos outros) e pela abóbada cheia,
       não por altura roubada da zona de texto. */
    const pw = 212;
    const px = (W - pw) / 2;
    const py = imposta - 6;
    const principal = arcoAberto(px, py, pw, H - py, pw / 2);
    return {
      defs: `
        <linearGradient id="chao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${C.verde}"/>
          <stop offset="1" stop-color="${C.verdeFundo}"/></linearGradient>
        <radialGradient id="halo" cx="0.5" cy="0.9" r="0.42">
          <stop offset="0" stop-color="${C.dourado}" stop-opacity="0.42"/>
          <stop offset="1" stop-color="${C.dourado}" stop-opacity="0"/></radialGradient>
        <linearGradient id="vaoFundo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${C.dourado}" stop-opacity="0.04"/>
          <stop offset="1" stop-color="${C.douradoClaro}" stop-opacity="0.34"/></linearGradient>
        <linearGradient id="luz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${C.dourado}" stop-opacity="0.05"/>
          <stop offset="0.5" stop-color="${C.douradoClaro}" stop-opacity="0.34"/>
          <stop offset="1" stop-color="${C.creme}" stop-opacity="0.92"/></linearGradient>
        ${mt.defs}`,
      arte: `
        <rect width="${W}" height="${H}" fill="url(#chao)"/>
        ${mt.uso(W, H, 0.16)}
        <ellipse cx="${W / 2}" cy="${H - 20}" rx="250" ry="112" fill="url(#halo)"/>
        ${arcada.join('')}
        <rect x="0" y="${imposta}" width="${W}" height="1" fill="${C.douradoClaro}" opacity="0.32"/>
        <path d="${principal}" fill="url(#luz)"/>
        <path d="${principal}" fill="none" stroke="${C.creme}" stroke-opacity="0.5" stroke-width="1.2"/>
        <rect x="${px - 16}" y="${py + pw / 2 - 1}" width="${pw + 32}" height="1.6" fill="${C.douradoClaro}" opacity="0.66"/>`,
    };
  },
});

/* --------------------------------------------------- 2 · MENTORIA ---------
   Papel: transformar faturamento em patrimônio — crescimento com cadência.
   É a capa `12-fase-4-expansao`: mesma forma, escala crescente, saindo do
   quadro. Chão marrom, que é o que a faixa já era. */
fundo({
  id: 'fundo-mentoria',
  arte: () => {
    const mt = meioTom('mt', C.douradoClaro, { y1: '0%', y2: '100%' });
    const cfg = [
      { x: -10, w: 52 },
      { x: 58, w: 78 },
      { x: 154, w: 112 },
      { x: 286, w: 156 },
      { x: 462, w: 212 },
      { x: 694, w: 286 },
    ];
    const arcos = cfg
      .map((a, i) => {
        const ah = a.w * 1.5;
        const p = arcoAberto(a.x, H - ah, a.w, ah, a.w / 2);
        return `<path d="${p}" fill="url(#vao)" opacity="${0.46 + i * 0.1}"/>
          <path d="${p}" fill="none" stroke="${C.douradoClaro}" stroke-opacity="${0.3 + i * 0.1}" stroke-width="1.2"/>`;
      })
      .join('');
    return {
      defs: `
        <linearGradient id="chao" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stop-color="${C.marrom}"/>
          <stop offset="1" stop-color="${C.marromBreu}"/></linearGradient>
        <linearGradient id="vao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${C.dourado}" stop-opacity="0.05"/>
          <stop offset="1" stop-color="${C.douradoClaro}" stop-opacity="0.62"/></linearGradient>
        ${mt.defs}`,
      arte: `
        <rect width="${W}" height="${H}" fill="url(#chao)"/>
        ${mt.uso(W, H, 0.14)}
        ${arcos}`,
    };
  },
});

/* --------------------------------------------------- 3 · CONVERSA ---------
   Papel: "prefere conversar antes?". A capa `11-fase-3-clientes` resolve
   exatamente isto — arcos que se entrelaçam, e a relação é a ÁREA que as duas
   partes passam a compartilhar. Chão dourado, que é o que a faixa já era.
   Aqui o par de tinta se inverte: sobre claro, o traço é marrom. */
fundo({
  id: 'fundo-conversa',
  arte: () => {
    const mt = meioTom('mt', C.marrom, { y1: '0%', y2: '60%' });
    const lw = 188;
    const passo = 94;
    const y = 104;
    const ah = H - y;
    const arcos = [];
    const clips = [];
    let x = -46;
    let i = 0;
    while (x < W) {
      const p = arcoAberto(x, y, lw, ah, lw / 2);
      arcos.push(`<path d="${p}" fill="none" stroke="${C.marrom}" stroke-opacity="0.55" stroke-width="1.4"/>`);
      clips.push(`<clipPath id="c${i}"><path d="${p}"/></clipPath>`);
      x += passo;
      i++;
    }
    const sobrepostos = [];
    for (let k = 0; k < i - 1; k++) {
      sobrepostos.push(
        `<g clip-path="url(#c${k})"><g clip-path="url(#c${k + 1})">
          <rect width="${W}" height="${H}" fill="${C.verde}" opacity="0.4"/></g></g>`,
      );
    }
    return {
      defs: `
        <linearGradient id="chao" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="${C.douradoClaro}"/>
          <stop offset="1" stop-color="${C.dourado}"/></linearGradient>
        ${clips.join('')}${mt.defs}`,
      arte: `
        <rect width="${W}" height="${H}" fill="url(#chao)"/>
        ${mt.uso(W, H, 0.2)}
        ${sobrepostos.join('')}
        ${arcos.join('')}
        <rect x="0" y="${y}" width="${W}" height="1" fill="${C.marrom}" opacity="0.24"/>`,
    };
  },
});

/* ================================================================ emissão == */

let n = 0;
for (const f of fundos) {
  const { defs, arte } = f.arte();
  // `claro` só muda a força do grão, como na plataforma.
  const opGrao = f.id === 'fundo-conversa' ? 0.13 : 0.17;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="presentation">
<title>${f.id}</title>
<defs>
${defs}
</defs>
${arte}
${grao(W, H, opGrao)}
</svg>
`;
  writeFileSync(resolve(saida, `${f.id}.svg`), svg);
  n++;
}

console.log(`${n} fundos escritos em assets/fundos/`);
