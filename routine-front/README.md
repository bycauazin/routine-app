# Interface do nuCorre

Aplicação React e Vite. Comece pelo [mapa do código](src/README.md). A raiz explica como [rodar a API e a interface](../README.md#como-rodar-desenvolvimento).

Rode `npm test`, `npm run lint` e `npm run build` nesta pasta.

Metas, relatórios e revisão de dias pendentes estão no [menu Relatórios](src/features/reports/README.md).

A [página inicial](src/pages/README.md) oferece **Entrar** e **Ver demonstração**.

## Marca, abertura e carregamento

- Logo: modelo adesivo oficial do bycauazin, gerado por `../../landing-page/brand/make-logo.mjs` (contorno `#faf3e8`, fita `#253b57`, interior `#f4a6c1`; na página clara contorno e fita trocam). Arquivos: `public/logo-sticker.svg`, `public/logo-sticker-light.svg` e `public/logo.svg`/`favicon.svg` (logo num quadrado azul-marinho). Ao trocar os SVGs, suba o `?v=` deles.
- Componentes em [src/components/layout/Brand.jsx](src/components/layout/Brand.jsx): `BrandMark`, `BrandWord` (nuCorre em Inter 800) e `BrandSignature` (`<bycauazin/>` em Major Mono Display).
- Abertura: [SiteIntro.jsx](src/components/layout/SiteIntro.jsx), igual à do portfólio e do Cacau. Toca em todo carregamento de `/` e uma vez por sessão nas outras páginas. Nunca toca com movimento reduzido. `?intro` força.
- Tela de carregamento: os quadrados da transição "Grade da semana" já cobrindo a tela (`#boot` em [index.html](index.html), fora do `#root`). `finishBoot()` em [src/lib/grid-transition.js](src/lib/grid-transition.js) os desfaz na diagonal quando a primeira tela está pronta, no mínimo 0,5 s depois da abertura da página. Com a abertura animada tocando ou movimento reduzido, só some.
- Transição "Grade da semana": da página pública para login/cadastro/app (`GridLink`) e entre as seções do menu do app (Hoje, Água, Relatórios, Configurações). Abas dentro da mesma seção (Dia/Semana/Simular, páginas de Configurações) trocam sem transição.
- Cursor "Encaixe" ([snap-cursor.jsx](src/pages/landing/snap-cursor.jsx) + `snap-cursor.css`): nas páginas públicas e dentro do app (inclusive na demonstração). Só com mouse.

## PWA (app instalável)

- A configuração fica em [vite.config.js](vite.config.js) (`VitePWA`). Todos os ícones (pwa-64/192/512, maskable, `favicon.ico` e `apple-touch-icon-180x180.png`) saem de [public/logo.svg](public/logo.svg) com `npm run pwa:icons` ([pwa-assets.config.js](pwa-assets.config.js)).
- O cache guarda só os arquivos do build. **Nada de `/api`** entra no cache (NetworkOnly e `navigateFallbackDenylist`), porque são dados privados que dependem do cookie. Sem internet, o app abre e mostra "Sem conexão".
- O app se atualiza sozinho (`autoUpdate`). No `npm run dev` o service worker fica desligado.
- Para testar: `npm run build && npm run preview` e abrir o Chrome DevTools → Application (Manifest e Service workers). A instalação de verdade precisa de https, ou seja, só em produção.
