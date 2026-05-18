---

title: "Segurança no frontend"
description: "Mapeando as fronteiras de segurança entre navegador, CDN e backend."
date: 2026-05-16
category: Segurança
topics:
- Frontend
- Web Security
- XSS
- Service Worker
toc: true
tocMaxDepth: 2
draft: false
thumbnail: "https://images.unsplash.com/photo-1621072148542-1a7a623efd28?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

---

O frontend assume hoje uma parte relevante da superfície de segurança de um produto digital. O código que roda no navegador não apenas renderiza telas: ele mantém estado, executa scripts, conversa com outras origens e atravessa fronteiras de autenticação, cache e autorização.

É entre a circulação dessas camadas que os problemas de segurança aparecem. Cada uma delas lê uma parte diferente da requisição, interpreta campos com regras próprias e frequentemente assume que a camada anterior já validou o contexto de segurança necessário. As falhas raramente estão em um campo de formulário ou em um endpoint isolado da API. Elas costumam surgir nas fronteiras entre esses componentes.

Quando o navegador confia em algo que o backend não revalidou, aparecem caminhos para bypass no cliente, Broken Access Control, IDOR ou BOLA. Quando a CDN reutiliza uma resposta sensível fora do contexto correto, o problema pode aparecer como erro de cache, cache key confusion ou web cache deception. Quando um script externo ganha autoridade demais, aumenta o risco de supply chain attack ou script injection. E quando a interface trata dados do próprio produto como automaticamente confiáveis, surgem aberturas para Stored XSS, DOM-based XSS ou HTML injection.

Na prática, vi essas falhas aparecerem em pequenas decisões do dia a dia. Para quem trabalha no frontend, é comum que a segurança costume ficar abstraída demais. Com a pressão por simplicidade de produto e velocidade de entrega, essas fronteiras costumam não ser discutidas com profundidade pelos times. A segurança no frontend deveria começar pelo mapeamento e pelo entendimento compartilhado dessas fronteiras: onde o navegador aplica regras? Onde a aplicação delega autoridade? Onde o backend precisa revalidar o contexto?

---

## Navegador

Para muitos o navegador é apenas o lugar onde se abre uma página. Mas ele participa ativamente das decisões de segurança da aplicação. É ele que define quando cookies acompanham uma requisição, se um script pode ser executado e se um recurso externo pode ser embutido. Também é ele que controla a comunicação entre documentos e limita quais APIs ficam disponíveis para cada página ou frame.

O primeiro limite que o navegador usa para organizar esses privilégios é a origem. No navegador, origem é a combinação entre esquema, host e porta. Por exemplo, `https://app.exemplo.com` e `https://admin.exemplo.com` não pertencem à mesma origem. `http://app.exemplo.com` e `https://app.exemplo.com` também não. Essa separação define o escopo básico de privilégio dentro do navegador.

A `Same-Origin Policy` define o isolamento padrão entre documentos de origens diferentes. Por padrão, uma página em `https://app.exemplo.com` não pode ler livremente uma resposta de `https://api.exemplo.com` dentro do navegador. O `CORS` é a exceção que controla esse isolamento: ele permite que o servidor declare quais origens podem ler uma resposta `cross-origin` no navegador. A diferença é essencial porque CORS não autoriza a operação na API; ele só decide se o JavaScript de outra origem pode acessar o conteúdo da resposta.

![Ilustração dos mecanismos e camadas do navegador](/blog/seguranca-frontend-mecanismos-2.png)

Em aplicações com iframes, popups, widgets e microfrontends, o navegador também passa a mediar comunicação entre domínios, produtos e times. `postMessage`, `window.opener`, cookies, storage e permissões de APIs deixam de ser detalhes de implementação e passam a ser pontos de entrada para troca de dados, alteração de estado e disparo de ações autenticadas. Por isso, o receptor de uma mensagem precisa validar origem, formato, tipo de comando e escopo antes de alterar estado ou chamar uma API.

## Scripts de Terceiros

Aplicações web executam seu próprio código e também código de terceiros. Analytics, testes A/B, chats, mapas, players, autenticação federada (MFEs) e ferramentas de suporte podem rodar no mesmo documento ou em iframes com permissões específicas. Quando um script de terceiro executa na mesma origem da aplicação, ele herda parte da autoridade do app: lê DOM, observa eventos, altera a página e inicia requisições.

O `HttpOnly` até impede que o JavaScript leia o cookie de sessão, mas não impede que o navegador envie esse cookie em requisições para a aplicação. Um script executando na mesma origem não precisa roubar o token para causar impacto: ele pode chamar endpoints autenticados e usar a sessão que o navegador já carrega. O alcance desse script depende de onde ele é executado: código carregado no documento principal pode observar e alterar a página; um iframe isolado fica mais restrito; um service worker pode interceptar requisições; um microfrontend pode compartilhar sessão, roteamento, storage e canais de eventos com o restante da aplicação.

Alguns controles reduzem essa superfície:

| Controle               | Significado                                                                                                                                   | O que faz                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSP**                | Política de Segurança de Conteúdo                                                                                                             | Define quais scripts, estilos, imagens, fontes e outros recursos o navegador pode carregar e executar. Com `nonce` ou `hash`, a página autoriza apenas scripts específicos, em vez de liberar qualquer script vindo de um domínio. |
| **Trusted Types**      | Tipos Confiáveis                                                                                                                              | Obriga pontos sensíveis da aplicação a receberem apenas conteúdo criado por políticas aprovadas. Isso reduz a chance de uma string comum ser inserida como HTML, script ou URL interpretável pelo navegador.                       |
| **SRI**                | Integridade de Sub-recurso                                                                                                                    | Faz o navegador comparar o hash de um arquivo externo com o hash declarado na página. Se o arquivo entregue pela CDN ou por outro domínio tiver sido alterado, o navegador bloqueia o carregamento.                                |
| **Permissions-Policy** | Política de Permissões                                                                                                                        | Controla quais APIs do navegador podem ser usadas pela página e por seus iframes, como câmera, microfone, geolocalização, tela cheia e sensores.                                                                                   |
| **COOP, COEP e CORP**  | **COOP:** Política de abertura entre origens. **COEP:** Política de incorporação entre origens. **CORP:** Política de recursos entre origens. | Reduzem o acoplamento entre documentos e recursos de origens diferentes. Essas políticas ajudam a isolar páginas, janelas, iframes e recursos carregados quando a aplicação precisa de separação mais rígida entre origens.        |

### XSS

XSS continua sendo uma quebra entre dado e código. A diferença é que, em aplicações atuais, ele aparece mais em pontos de composição: editores WYSIWYG, previews, `innerHTML`, `srcdoc`, renderização server-side com hidratação, widgets externos e exceções ao escape padrão do framework.

Frameworks como React, Angular e Svelte já escapam texto como padrão ao renderizar. Por exemplo: se uma propriedade como `comment.text` contém `<b>olá</b>`, o framework não entrega isso ao navegador como uma tag `<b>`. Ele renderiza os caracteres na tela. O usuário vê algo como `<b>olá</b>`, e não uma palavra em negrito criada a partir daquele texto.

O risco aparece quando o componente muda essa relação e **entrega uma string para o navegador interpretar como HTML**. Isso costuma acontecer quando o produto precisa exibir conteúdo externo como um bloco de CMS, um comentário formatado ou um embed. Nessa hora, o desenvolvedor deixa de renderizar texto dentro de um parágrafo e passa a renderizar HTML dentro da página. A partir daí, o navegador está criando elementos, atributos e relações no DOM com base naquela string.

No React, `dangerouslySetInnerHTML` escreve HTML bruto no DOM. No Svelte, `{@html ...}` faz o mesmo tipo de inserção. No Angular, `[innerHTML]` passa pela sanitização do framework, mas exceções criadas com `DomSanitizer`, como `bypassSecurityTrustHtml`, retiram o valor do caminho normal de proteção. A própria **[documentação do Angular][1]** recomenda que esse uso seja cuidadoso e raro.

Um bom exemplo em Angular pode ser o **[CVE-2026-32635][3]** que envolveu atributos sensíveis, como `href` e `src` combinados com internacionalização por `i18n-<attribute>`. Nessa ocorrência, a combinação podia contornar a sanitização embutida. O ponto relevante para frontend é reconhecer o padrão: mesmo um framework com sanitização por contexto pode ter caminhos especiais que mudam como o valor chega ao DOM.

No Svelte, o **[CVE-2026-27121][4]** atingiu a renderização no servidor (SSR). Versões até `5.51.4` podiam incluir propriedades de evento no HTML gerado quando a aplicação espalhava atributos. Ou seja, se um componente hipotético `<article {...externalAttrs} />` usasse uma fonte externa, qualquer chave dentro de `externalAttrs` poderia virar atributo deste elemento. No caso de `href`, `src`, `style`, `srcdoc` ou propriedades de evento, o valor do atributo mudava a forma como o navegador interpretava o elemento e isso foi explorado no ataque. Esse caso amplia a discussão além de `{@html ...}`: XSS também pode surgir quando a aplicação transforma objetos em atributos durante SSR e entrega o HTML inicial já com uma interpretação perigosa para o navegador.

Em resumo, a prevenção começa mantendo texto como texto. Quando o produto precisa renderizar HTML, o código deve deixar explícito onde esse HTML nasce, qual componente transforma o conteúdo, quais tags e atributos são aceitos e qual componente recebe o resultado. No navegador, o **Trusted Types** reduz a criação acidental de HTML por string em pontos sensíveis do DOM. O **CSP** limita caminhos de execução quando uma falha chega ao navegador. Nenhum dos dois substitui a decisão principal: conteúdo vindo de usuário ou fornecedor externo não deve chegar a `dangerouslySetInnerHTML`, `{@html ...}`, `[innerHTML]`, `srcdoc`, `href` ou `src` sem uma política de sanitização compatível com o destino.

## Protocolo HTTP

O HTTP é o protocolo que define o formato de troca entre navegador, infraestrutura e backend. Cada requisição carrega uma URL, um método, headers, cookies e, em alguns casos, um corpo. Para o navegador, esses campos definem como a chamada será montada: qual endereço será acessado, qual ação será executada, quais cookies acompanham a requisição e quais informações adicionais seguem nos headers.

O mesmo formato também orienta como a resposta será interpretada depois. Uma rota como `/dashboard` pode devolver uma página pública para um visitante e uma página autenticada para um usuário logado. A diferença entre essas respostas não está só na URL; ela pode depender de cookie, tenant, idioma ou permissão. Se uma camada considera apenas o `path`, ela pode tratar respostas diferentes como se fossem a mesma coisa. O erro acontece na perda de significado entre a requisição que pediu a página e a resposta que foi reaproveitada.

```http
GET /dashboard HTTP/1.1
Host: app.exemplo.com
Cookie: session=usuario-a
Accept-Language: pt-BR
```

Nesse exemplo, o backend usa o cookie de sessão para montar o dashboard do `usuário A`. Se a **cache key** da CDN considera apenas o `path` `/dashboard`, a resposta pode ser salva como se fosse válida para qualquer requisição à mesma rota. Uma próxima chamada para `/dashboard`, feita por outro usuário, pode receber o HTML gerado para a sessão anterior. O navegador não valida essa semântica. Ele recebe a resposta e renderiza o conteúdo.

Alguns anos atrás, Omer Gil descreveu uma [falha de web cache deception no PayPal][2]. A divergência era na classificação da mesma URL por duas camadas diferentes. O servidor tratava a requisição como uma rota autenticada e retornava conteúdo privado. A camada de cache interpretava a URL como recurso estático e podia armazenar a mesma resposta. O caso mostra como uma resposta privada pode sair do escopo correto quando HTTP e cache não compartilham a mesma leitura da rota.

Cabeçalhos como `Host`, `X-Forwarded-Host` e `X-Forwarded-Proto` entram em decisões que dependem do endereço público da aplicação. O `Host` vem da requisição HTTP original. Já `X-Forwarded-Host` e `X-Forwarded-Proto` costumam ser preenchidos por proxies, gateways ou CDN para informar ao backend qual domínio e qual protocolo o usuário acessou antes de a requisição ser encaminhada internamente.

```http
GET /login HTTP/1.1
Host: app.exemplo.com
X-Forwarded-Host: atacante.exemplo
X-Forwarded-Proto: https
```

O risco aparece quando o backend trata esses headers como se tivessem sido criados pela infraestrutura, mas eles vieram da requisição enviada pelo cliente. Se a aplicação usa `X-Forwarded-Host` para montar um callback ou um redirecionamento, ela pode gerar uma URL apontando para um domínio informado por quem fez a requisição. O mesmo código que deveria produzir `https://app.exemplo.com/reset?...` pode acabar produzindo `https://atacante.exemplo/reset?...`.

A defesa aqui fica na fronteira entre infraestrutura e aplicação. A CDN, o proxy ou o gateway devem remover headers de encaminhamento recebidos do cliente e criar seus próprios valores antes de chamar o backend. O backend, por sua vez, não deve aceitar qualquer host como válido: domínios públicos usados para callbacks, redirects e links absolutos precisam vir de configuração conhecida ou de uma lista explícita de hosts permitidos.

A resposta HTTP também precisa declarar corretamente como pode ser armazenada. Uma página que depende de sessão, autorização ou tenant não deve ser entregue com a mesma política de cache de um arquivo público. Quando o conteúdo não deve ser armazenado, a resposta deve deixar isso explícito:

```http
Cache-Control: private, no-store
Vary: Cookie, Authorization
```

O `Cache-Control` define se a resposta pode ser armazenada e em [quais condições deve ser armazenada](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/Caching), por exemplo: `no-store` instrui caches a não armazenarem a resposta. `private` restringe o armazenamento a caches do próprio usuário, como o cache do navegador. Quando uma resposta pode ser armazenada, mas muda conforme algum campo da requisição, o `Vary` informa quais campos alteram o conteúdo retornado e evita que respostas geradas com cookies ou autorização diferentes sejam tratadas como equivalentes. A regra é a mesma dos headers de encaminhamento: o que foi enviado como privado na geração da resposta não pode virar compartilhável no caminho até o navegador.

## Service Worker

Um service worker é um script que o navegador registra para uma aplicação e executa em segundo plano, separado da página. Ele não renderiza interface. O papel dele é receber eventos do navegador e atuar em tarefas como interceptar requisições, responder com conteúdo em cache, sincronizar dados e preparar a aplicação para funcionar melhor em conexões instáveis ou offline.

Depois de registrado e ativado, o service worker passa a atuar dentro de uma origem e de um escopo. Esse escopo define quais páginas ele consegue controlar. Um worker registrado em `/app/` só interfere nas páginas abaixo desse caminho. Um worker registrado em `/` pode alcançar boa parte da aplicação. Essa diferença importa porque, quando o worker intercepta uma requisição, ele fica no caminho entre a página e a rede.

```js
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open("runtime").then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      cache.put(event.request, response.clone());

      return response;
    })
  );
});
```

Esse exemplo registra um handler para o evento `fetch`. Ou seja, sempre que uma página controlada pelo service worker faz uma requisição `GET`, o worker procura uma resposta no `Cache Storage`. Se encontra, devolve a resposta armazenada. Se não encontra, busca na rede, salva uma cópia e devolve o resultado para a página.

A regra parece conveniente, mas trata todo `GET` como cacheável. Um asset versionado, uma página pública e uma resposta de `/api/me` passam pelo mesmo caminho. O `Cache Storage` armazena pares de requisição e resposta; ele não sabe sozinho se uma resposta depende de sessão, autorização ou tenant. Essa classificação precisa estar no código do worker.

O **[CVE-2024-1554][7]** no Firefox ilustra o risco de uma chave de cache que não representa completamente o contexto da requisição. Nesse caso, as requisições feitas via `fetch()` e navegação entre rotas puderam compartilhar a mesma entrada de cache porque certos headers opcionais do `fetch()` não participavam da composição da cache key. O resultado era uma forma de cache poisoning local: um atacante conseguia preparar uma resposta para determinada URL e, em uma visita posterior à mesma URL, o navegador podia reutilizar aquela resposta no lugar da resposta correta.

A estratégia de [cache do service worker][6] não é a mesma coisa que HTTP caching. No HTTP caching, o navegador e caches intermediários seguem headers como `Cache-Control` e `Vary`. No service worker, a aplicação escreve o script que decide se uma requisição usa cache, rede ou uma combinação dos dois. A MDN descreve esse desenho como estratégias de cache, como `cache first`, quando o worker consulta o cache antes da rede, e `network first`, quando busca a rede primeiro e usa o cache como fallback.

Esse ciclo de atualização também faz parte da segurança. Um worker antigo pode continuar ativo até que a nova versão seja instalada, ativada e passe a controlar as páginas abertas. Se uma correção muda regras de cache, rotas ou tratamento de sessão, a versão nova precisa remover caches antigos no evento `activate` e assumir controle dos clientes de forma planejada.

[6]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching "Caching strategies - MDN"
[7]: https://nvd.nist.gov/vuln/detail/CVE-2024-1554 "CVE-2024-1554 Detail - NVD"

## CDN

A CDN fica entre o navegador e a aplicação e é uma infraestrutura externa que toma decisões antes da requisição chegar ao backend. Ela pode responder diretamente a requisição, alterar headers, aplicar rewrites ou executar funções dentro de sua infraestrutura.

O primeiro cuidado a ser tomado é classificar o tráfego pelo comportamento real da aplicação, não apenas pelo formato da URL a ser acessada. Essa separação precisa aparecer nas regras da CDN.

```text
/assets/app.8f31a.js     → asset versionado
/pricing                 → página pública
/dashboard               → página autenticada
/api/me                  → payload por usuário
```

Uma regra ampla como *“aplicar cache a tudo que termina em `.css` ou `.js`”* pode classificar mal o tráfego. Uma regra baseada apenas em prefixo pode atingir rotas que mudaram de comportamento depois de uma alteração no produto. A CDN precisa acompanhar as alterações entre novas versões da aplicação, porque ela toma decisões antes da origem.

Rewrites e funções exigem a mesma atenção. Se a regra na CDN altera `path`, `headers`, `cookies` ou `origin`, o backend passa a receber uma requisição diferente da original. Essas transformações precisam ser logadas em ferramentas de observabilidade porque afetam roteamento, autenticação e autorização.

Um caso público que mostra esse impacto foi um incidente na [Cloudflare][5], causado por um bug no parser HTML usado por recursos como `Email Obfuscation`, `Server-side Excludes` e `Automatic HTTPS Rewrites`. Em certas respostas HTTP, servidores retornavam trechos de memória que podiam conter cookies, tokens de autenticação, corpos de POST e outros dados sensíveis. Parte desse conteúdo chegou a ser indexada por mecanismos de busca e, por falta de configurações corretas de invalidação, muitas aplicações foram afetadas e dados vazaram.

Invalidação é outro cuidado. Se uma página muda de pública para autenticada, se uma regra de cache é corrigida ou se uma resposta sensível foi armazenada por engano, publicar uma nova versão do frontend não remove automaticamente o conteúdo já distribuído pela CDN. A invalidação precisa acompanhar a mudança. Aqui entram políticas como `stale-while-revalidate`, `stale-if-error` ou configurações equivalentes do provedor, que também precisam ser tratadas por classe de rota. Elas podem fazer sentido para páginas públicas e assets. A configuração junto à CDN deve deixar claro quais rotas podem ser respondidas pela CDN.

## Conclusão

Segurança depende de coerência entre navegador, HTTP, CDN, BFF e APIs. Cada fronteira precisa definir o que aceita, o que transforma e o que revalida. O trabalho de arquitetura é acompanhar o dado em movimento: de onde ele vem, quem lê, qual transformação ocorre, onde ele fica armazenado, qual política do navegador se aplica e qual camada decide a próxima ação. Ao projetar uma aplicação, o arquiteto precisa ir além dos fluxos de negócio ou da lógica de interface; ele deve pensar em quais dados atravessam cada fronteira e quais componentes de cada camada podem alterar esses dados.

Uma boa arquitetura no frontend responde a perguntas como:

* quais origens podem abrir, embutir, ler ou enviar mensagens para a aplicação?
* quais scripts executam na mesma origem do produto?
* quais dados ficam em cookies, estado em memória, `sessionStorage`, `localStorage`, IndexedDB e Cache Storage?
* quais headers são enviados pelo cliente e quais são definidos pela infraestrutura?
* quais rotas variam por sessão, autorização, tenant, idioma ou feature flag?
* quais APIs recebem identificadores vindos do frontend?
* onde sujeito, objeto, ação e tenant são revalidados?
* quais componentes transformam texto em HTML interpretável?

---

## TLDR

* O frontend participa da segurança porque executa código, mantém estado, chama APIs e compõe recursos de várias origens.
* O navegador controla origem, cookies, CORS, CSP, storage, permissões e comunicação entre documentos, mas não decide autorização de negócio.
* XSS surge quando uma string deixa de ser exibida como texto e passa a ser interpretada como HTML, atributo, URL ou comportamento no DOM.
* HTTP e CDN precisam preservar a semântica da resposta: conteúdo privado não pode virar compartilhável por erro de cache, header ou regra no edge.
* Arquitetura segura explicita onde cada dado entra, quem transforma, onde fica armazenado e em qual camada a confiança é revalidada.

[1]: https://angular.dev/api/platform-browser/DomSanitizer "DomSanitizer • Angular"
[2]: https://omergil.blogspot.com/2017/02/web-cache-deception-attack.html "Vulnerabilidade no PayPal"
[3]: https://github.com/angular/angular/security/advisories/GHSA-g93w-mfhg-p222 "XSS in i18n attribute bindings · Advisory · angular/angular · GitHub"
[4]: https://github.com/sveltejs/svelte/security/advisories/GHSA-f7gr-6p89-r883 "Cross-site scripting via spread attributes in Svelte SSR · Advisory · sveltejs/svelte · GitHub"
[5]: https://blog.cloudflare.com/incident-report-on-memory-leak-caused-by-cloudflare-parser-bug/ "Incident report on memory leak caused by Cloudflare parser bug"
