# Interface do Routine

Aplicação React e Vite. Comece pelo [mapa do código](src/README.md). A raiz explica como [rodar a API e a interface](../README.md#como-rodar-desenvolvimento).

Rode `npm test`, `npm run lint` e `npm run build` nesta pasta.

Metas, relatórios e revisão de dias pendentes estão no [menu Relatórios](src/features/reports/README.md).

A [página inicial](src/pages/README.md) oferece **Entrar** e **Ver demonstração**.

## PWA (app instalável)

- A configuração fica em [vite.config.js](vite.config.js) (`VitePWA`). Os ícones são gerados a partir de [public/logo.svg](public/logo.svg) com `npm run pwa:icons` ([pwa-assets.config.js](pwa-assets.config.js)). `favicon.ico` e `apple-touch-icon.png` são feitos à mão e o gerador não mexe neles.
- O cache guarda só os arquivos do build. **Nada de `/api`** entra no cache (NetworkOnly e `navigateFallbackDenylist`), porque são dados privados que dependem do cookie. Sem internet, o app abre e mostra "Sem conexão".
- O app se atualiza sozinho (`autoUpdate`). No `npm run dev` o service worker fica desligado.
- Para testar: `npm run build && npm run preview` e abrir o Chrome DevTools → Application (Manifest e Service workers). A instalação de verdade precisa de https, ou seja, só em produção.
