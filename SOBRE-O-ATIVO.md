# Página de links — Dani Meger (cópia publicada)

> **Cópia de leitura para o time de design.** Sem deploy: abre no navegador.
> **GERADO. Não editar nada aqui à mão.** Esta pasta é montada por
> `clientes/cliente-daniele-meger/2-motor-de-crescimento/marketing/lp-links/publicar.mjs`
> a partir do repo do cliente (privado, sem remote). Correção se faz na origem
> e republica.

## O que é

A v2 da página de links da bio, na identidade MEGER. **HTML e CSS puros, zero
JavaScript**, no molde do linktree da Sabina Deweik.

Três destinos, do mais frio ao mais quente: o **diagnóstico DNA Financeiro**
(gratuito), a **Mentoria Mente Médica Milionária** (aplicação) e o **WhatsApp**
direto — mais as redes.

## O que ela conserta

A versão em produção (`links.danielemeger.com.br`) é um app React cujos três
banners são **imagens sem texto**, e cujo HTML servido não contém conteúdo
nenhum além do `<title>`. Na prática:

| Antes | Agora |
|---|---|
| prévia **em branco** ao compartilhar (zero `og:`) | `og:` completo |
| três links **sem nome** para leitor de tela | nove links, todos nomeados |
| copy presa dentro de `.webp` | 1226 caracteres de texto no HTML |
| dois dos três banners no **mesmo destino** | três destinos distintos |
| **nenhum** link com UTM | `utm_source=linktree` em toda saída |
| rodapé com um **quarto nome de marca** | **MEGER · Clínica Financeira** |
| 270 KB de JS para desenhar 3 links | **zero JavaScript** · 316 KB no total |


---

_Impressão da origem: `26f440c38606fd72` · gerado em 2026-08-03T18:09:45.467Z_
