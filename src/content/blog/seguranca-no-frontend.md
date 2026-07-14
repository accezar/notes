---

title: "Segurança no frontend"
description: "Mapeando as fronteiras de segurança entre navegador, CDN e backend."
date: 2026-05-16
category: Segurança
topics:
- Frontend
- Web Security
- XSS
- CSRF
- Service Worker
toc: true
tocMaxDepth: 2
draft: false
thumbnail: "https://images.unsplash.com/photo-1621072148542-1a7a623efd28?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

---

O frontend assume hoje uma parte relevante da superfície de segurança de um produto digital. O código que roda no navegador não apenas renderiza telas: ele mantém estado, executa scripts, conversa com outras origens e atravessa fronteiras de autenticação, cache e autorização.

É na comunicação entre as camadas que os problemas de segurança aparecem. Cada uma delas lê uma parte diferente da requisição que é feita, interpreta campos com regras próprias e frequentemente assume que a camada anterior já validou o contexto de segurança necessário. As falhas raramente estão em um campo de formulário ou em um endpoint isolado da API. Elas costumam surgir nas fronteiras entre esses componentes arquiteturais.

Por exemplo, quando o navegador confia em algo que o backend não revalidou, aparecem caminhos para bypass no cliente, [Broken Access Control](https://owasp.org/Top10/2021/pt-BR/A01_2021-Broken_Access_Control/), [IDOR](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html) ou [BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/). Quando a CDN reutiliza uma resposta sensível fora do contexto correto, o problema pode aparecer como erro de cache, [falha na composição da cache key](https://portswigger.net/web-security/web-cache-poisoning/exploiting-implementation-flaws) ou [web cache deception](https://portswigger.net/web-security/web-cache-deception). Quando um script externo ganha autoridade demais, aumenta o risco de [supply chain attack](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_JavaScript_Management_Cheat_Sheet.html) ou [script injection](https://owasp.org/www-community/attacks/xss/). E quando a interface trata dados do próprio produto como automaticamente confiáveis, surgem aberturas para [Stored XSS](https://portswigger.net/web-security/cross-site-scripting/stored), [DOM-based XSS](https://portswigger.net/web-security/cross-site-scripting/dom-based) ou [HTML injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/03-Testing_for_HTML_Injection).

Na prática, vi essas falhas aparecerem em pequenas decisões do dia a dia. Para quem trabalha no frontend, é comum que a segurança fique abstrata demais. Com a pressão por simplicidade de produto e velocidade de entrega, essas fronteiras costumam não ser discutidas com profundidade pelos times. A segurança no frontend deveria começar pelo mapeamento e pelo entendimento compartilhado dessas fronteiras: onde o navegador aplica regras? Onde a aplicação delega autoridade? Onde o backend precisa revalidar o contexto?

---

## Navegador

Para muitas pessoas, o navegador é apenas a janela do sistema em que uma página é aberta. Mas ele participa ativamente das decisões de segurança da aplicação. É ele que define quando e quais cookies acompanham uma requisição, se um script pode ser executado e se um recurso externo pode ser embutido. Também é ele que controla a comunicação entre documentos e limita quais APIs ficam disponíveis para cada página ou frame.

O primeiro limite que o navegador usa para organizar esses privilégios é a origem. Para o navegador, origem é a combinação entre esquema, host e porta. Por exemplo, `https://app.exemplo.com` e `https://admin.exemplo.com` não pertencem à mesma origem. `http://app.exemplo.com` e `https://app.exemplo.com` também não. Essa separação define o escopo básico de privilégio dentro do navegador.

O navegador aplica políticas de segurança para definir esses escopos. A `Same-Origin Policy`, por exemplo, restringe como documentos e scripts de uma origem podem acessar recursos de outra e estabelece o isolamento padrão entre origens diferentes. Por isso, uma página em `https://app.exemplo.com` não pode ler livremente, no navegador, uma resposta de `https://api.exemplo.com`. O `CORS` (Cross-Origin Resource Sharing) permite flexibilizar esse isolamento ao possibilitar que o servidor declare quais origens podem acessar uma resposta `cross-origin`. A diferença é essencial porque CORS não autoriza a operação na API; ele apenas determina se o JavaScript de outra origem pode acessar o conteúdo da resposta.

![Ilustração dos mecanismos e camadas do navegador](/blog/seguranca-frontend-mecanismos-2.png)

### Cookies, SameSite e CSRF

Origem e site também não são a mesma coisa. `https://app.exemplo.com` e `https://api.exemplo.com` são origens diferentes, mas podem ser considerados o mesmo site para regras como `SameSite` quando compartilham o domínio e o esquema. Essa diferença importa porque o CORS pode impedir que um script leia a resposta sem impedir todas as formas de envio de uma requisição `cross-site`. O servidor também define parte da política de segurança da sessão por meio dos atributos enviados no cabeçalho, por exemplo:

```http
Set-Cookie: session=...; Path=/; Secure; HttpOnly; SameSite=Lax
```

Nesse cookie, `Secure` restringe o envio a conexões HTTPS, `HttpOnly` impede a leitura pelo JavaScript e `SameSite` limita os contextos entre sites nos quais o navegador inclui a credencial. Esses atributos reduzem a superfície, mas o `SameSite` deve ser tratado como defesa adicional, não como proteção completa contra **[CSRF - Cross-site request forgery][9]**. Operações que alteram o estado da aplicação no servidor ainda podem exigir token antifalsificação, a validação do header `Origin` ou o uso de `Fetch Metadata`, conforme o fluxo. A fronteira permanece a mesma: o navegador decide quando envia o cookie; o backend decide se aquela operação é válida naquele contexto.

Em aplicações com iframes, popups, widgets e microfrontends, o navegador também passa a mediar comunicação entre domínios, produtos e times. `postMessage`, `window.opener`, cookies, storage e permissões de APIs deixam de ser detalhes de implementação e passam a ser pontos de entrada para troca de dados, alteração de estado e disparo de ações autenticadas. Por isso, o receptor de uma mensagem precisa validar origem, formato, tipo de comando e escopo antes de alterar estado ou chamar uma API.

## Scripts de Terceiros

Aplicações web executam seu próprio código e também código de terceiros. Analytics, testes A/B, chats, mapas, players, autenticação federada, microfrontends (MFEs) e ferramentas de suporte podem rodar no mesmo documento ou em iframes com permissões específicas. Quando um script de terceiro é executado na mesma origem da aplicação, ele herda parte da autoridade do app: lê DOM, observa eventos, altera a página e inicia requisições.

O atributo `HttpOnly` impede que o JavaScript leia o cookie de sessão, mas não evita que o navegador o inclua nas requisições destinadas à aplicação. Por isso, um script executado na mesma origem não precisa obter o token para agir em nome do usuário: ele pode chamar endpoints autenticados e aproveitar a sessão que o navegador já envia. O alcance desse código depende do contexto em que ele é executado. Um script carregado no documento principal pode observar eventos, acessar o DOM e alterar a página; um iframe isolado opera sob restrições maiores; um service worker pode interceptar requisições dentro de seu escopo; e um microfrontend, dependendo da arquitetura, pode compartilhar sessão, roteamento, storage e canais de eventos com o restante da aplicação.


Alguns controles reduzem essa superfície:

| Controle               | Significado                                                                                                                                   | O que faz                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSP**                | Política de Segurança de Conteúdo                                                                                                             | Define quais scripts, estilos, imagens, fontes e outros recursos o navegador pode carregar e executar. Com `nonce` ou `hash`, a página autoriza apenas scripts específicos, em vez de liberar qualquer script vindo de um domínio. |
| **Trusted Types**      | Tipos Confiáveis                                                                                                                              | Obriga pontos sensíveis da aplicação a receberem apenas conteúdo criado por políticas aprovadas. Isso reduz a chance de uma string comum ser inserida como HTML, script ou URL interpretável pelo navegador.                       |
| **SRI**                | Integridade de Sub-recurso                                                                                                                    | Faz o navegador comparar o hash de um arquivo externo com o hash declarado na página. Se o arquivo entregue pela CDN ou por outro domínio tiver sido alterado, o navegador bloqueia o carregamento.                                |
| **Permissions-Policy** | Política de Permissões                                                                                                                        | Controla quais APIs do navegador podem ser usadas pela página e por seus iframes, como câmera, microfone, geolocalização, tela cheia e sensores.                                                                                   |
| **COOP, COEP e CORP**  | **COOP:** Política de abertura entre origens. **COEP:** Política de incorporação entre origens. **CORP:** Política de recursos entre origens. | Reduzem o acoplamento entre documentos e recursos de origens diferentes. Essas políticas ajudam a isolar páginas, janelas, iframes e recursos carregados quando a aplicação precisa de separação mais rígida entre origens.        |

Esses controles atuam principalmente no carregamento e na execução de código dentro do navegador. Dependências incorporadas ao bundle durante o build atravessam outra fronteira do processo de construção e distribuição do software — a chamada **[cadeia de suprimentos de software][12]**. Nesse estágio, controles como lockfiles, revisão de dependências, verificação da proveniência dos artefatos, análise de pacotes e proteção do pipeline precisam agir antes da publicação. O `SRI`, por exemplo, verifica a integridade de um arquivo carregado em runtime, mas não valida uma dependência que já foi incorporada ao JavaScript da aplicação.


### XSS (Cross-Site Scripting)

O `XSS` ocorre quando um conteúdo que deveria ser tratado apenas como texto passa a ser interpretado pelo navegador como código executável ou marcação HTML. Nas aplicações, isso aparece principalmente nos pontos em que incorporamos conteúdo dinâmico, como editores WYSIWYG, previews, embeds, `innerHTML`, `srcdoc`, renderização no servidor com hidratação, widgets externos e quando fazemos exceções ao escape padrão do framework.

Frameworks como React, Angular e Svelte já escapam texto como padrão ao renderizar. Por exemplo: se uma propriedade como `comment.text` contém `<b>olá</b>`, o framework não entrega isso ao navegador como uma tag `<b>`. Ele renderiza os caracteres na tela. O usuário vê algo como `<b>olá</b>`, e não uma palavra em negrito criada a partir daquele texto.

O risco aparece quando o componente muda essa relação e **entrega uma string para o navegador interpretar como HTML**. Isso costuma acontecer quando o produto precisa exibir conteúdo externo como um bloco de CMS, um comentário formatado ou um embed. Nessa hora, o desenvolvedor deixa de renderizar texto dentro de um parágrafo e passa a renderizar HTML dentro da página. A partir daí, o navegador está criando elementos, atributos e relações no DOM com base naquela string.

No React, `dangerouslySetInnerHTML` escreve HTML bruto no DOM. No Svelte, `{@html ...}` faz o mesmo tipo de inserção. No Angular, `[innerHTML]` passa pela sanitização do framework, mas exceções criadas com `DomSanitizer`, como `bypassSecurityTrustHtml`, retiram o valor do caminho normal de proteção. A própria **[documentação do Angular][1]** recomenda que esse uso seja cuidadoso e raro.

Um bom exemplo de um problema em Angular pode ser o caso do **[CVE-2026-32635][3]** que envolveu atributos sensíveis, como `href` e `src` combinados com internacionalização por `i18n-<attribute>`. Nessa ocorrência, a combinação podia contornar a sanitização. A lição aqui é reconhecer que mesmo um framework com sanitização por contexto pode ter caminhos especiais que mudam como o valor chega ao DOM.

No Svelte, o **[CVE-2026-27121][4]** atingiu a renderização no servidor (SSR). Versões até a `5.51.4` podiam incluir propriedades de evento no HTML produzido pelo servidor quando a aplicação usava o spread de atributos. O spread permite aplicar a um elemento todas as propriedades de um objeto de uma só vez. Por exemplo, em `<article {...externalAttrs} />`, cada chave de `externalAttrs` pode se transformar em um atributo do elemento. Se o objeto contiver `{ class: "card", title: "Notícia" }`, o resultado esperado será algo equivalente a `<article class="card" title="Notícia">`.

O problema aparecia quando esse objeto vinha de uma fonte externa e continha chaves capazes de alterar o comportamento do elemento, como `href`, `src`, `style`, `srcdoc` ou propriedades de evento. Por exemplo, se `externalAttrs` contivesse `{ class: "card", onmouseover: "alert('XSS')" }`, uma versão vulnerável poderia tratar a propriedade `class` e a propriedade `onmouseover` da mesma forma, produzindo no servidor um HTML equivalente a `<article class="card" onmouseover="alert('XSS')">`. Nesse processo, `onmouseover` deixaria de ser apenas uma propriedade do objeto e passaria a fazer parte do documento da página como um atributo de evento, permitindo ao navegador executar qualquer código contido nesse atributo.

Nesse cenário, o risco não está apenas no valor atribuído a uma propriedade, mas também no nome dessa propriedade e na forma como ela é interpretada. Uma chave pode determinar qual atributo será criado e transformar dados externos em comportamento ativo no documento. Como esse conteúdo é produzido no servidor, o HTML pode chegar ao navegador já contendo o código perigoso, antes mesmo de a aplicação concluir a renderização ou a hidratação.

Esse caso amplia a discussão para além de `{@html ...}`: o XSS também pode surgir quando a aplicação transforma um objeto externo em vários atributos sem limitar explicitamente quais chaves são permitidas.

Em resumo, a prevenção começa mantendo texto como texto. Quando o produto precisa renderizar HTML, o código deve deixar explícito onde esse HTML nasce, qual componente transforma o conteúdo, quais tags e atributos são aceitos e qual componente recebe o resultado. No navegador, o **Trusted Types** reduz a criação acidental de HTML por string em pontos sensíveis do DOM. O **CSP** limita caminhos de execução quando uma falha chega ao navegador. Nenhum dos dois substitui a decisão principal: conteúdo vindo de usuário ou fornecedor externo não deve chegar a `dangerouslySetInnerHTML`, `{@html ...}`, `[innerHTML]`, `srcdoc`, `href` ou `src` sem uma política de sanitização compatível com o destino.

## Protocolo HTTP

O `HTTP` é o protocolo que define o formato da troca de mensagens entre navegador, infraestrutura e backend. Cada requisição carrega uma URL, um método, headers, cookies e, em alguns casos, um corpo. Para o navegador, esses campos definem como a chamada será montada: qual endereço será acessado, qual ação será executada, quais cookies acompanham a requisição e quais informações adicionais seguem nos headers.

Esse mesmo formato também orienta como a resposta será interpretada depois. Uma rota como `/dashboard` pode devolver uma página pública para um visitante e uma página autenticada para um usuário logado. A diferença entre essas respostas pode depender de cookie, tenant, idioma ou permissão. Se uma camada considera apenas `/dashboard` como critério para identificar a resposta, ela pode tratar respostas diferentes como se fossem a mesma coisa. O problema aqui acontece na perda de significado entre a requisição que pediu a página e a resposta que foi reaproveitada.

```http
GET /dashboard HTTP/1.1
Host: app.exemplo.com
Cookie: session=usuario-a
Accept-Language: pt-BR
```

Nesse exemplo, o backend usa o cookie de sessão `session` para montar o dashboard do `usuário-a`. Se a **cache key** da CDN considera apenas o `path` `/dashboard`, a resposta pode ser salva como se fosse válida para qualquer requisição à mesma rota. Uma próxima chamada para `/dashboard`, feita por outro usuário, pode receber o HTML gerado para a sessão anterior. O navegador não valida essa semântica. Ele recebe a resposta e renderiza o conteúdo.

Alguns anos atrás, Omer Gil descreveu uma [falha de web cache deception no PayPal][2]. A divergência era na classificação da mesma URL por duas camadas diferentes. O servidor tratava a requisição como uma rota autenticada e retornava conteúdo privado. A camada de cache interpretava a URL como recurso estático e podia armazenar a mesma resposta. Esse relato ilustra bem como uma resposta privada pode sair do escopo correto quando o backend e a **cache key** de uma camada intermediária (CDN) não representam a rota da mesma forma.

Essa mesma dependência da interpretação entre camadas aparece nos cabeçalhos que representam o endereço público da aplicação. `Host`, `X-Forwarded-Host` e `X-Forwarded-Proto` podem influenciar as ações de redirecionamentos, callbacks e links enviados ao usuário. O `Host` vem da requisição HTTP original, enquanto `X-Forwarded-Host` e `X-Forwarded-Proto` costumam ser definidos por proxies, gateways ou CDNs para informar ao backend qual domínio e qual protocolo foram usados pelo usuário antes do encaminhamento interno da requisição.

```http
GET /login HTTP/1.1
Host: app.exemplo.com
X-Forwarded-Host: atacante.exemplo
X-Forwarded-Proto: https
```

No trecho de código acima, o risco aparece quando o backend confia nesses headers como se eles tivessem sido definidos pela infraestrutura, embora tenham sido preservados da requisição enviada pelo cliente. Se a aplicação usa `X-Forwarded-Host` para montar um callback ou um redirecionamento, ela pode gerar uma URL apontando para um domínio informado nesse header. Assim, o mesmo fluxo que deveria produzir `https://app.exemplo.com/reset?...` pode acabar produzindo `https://atacante.exemplo/reset?...`.

A defesa aqui precisa ser aplicada na fronteira entre infraestrutura e aplicação. A CDN, o proxy ou o gateway devem remover headers de encaminhamento recebidos do cliente e substituí-los por valores definidos a partir da conexão que realmente receberam antes de chamar o backend. O backend também não deve aceitar qualquer host como válido: os domínios usados para callbacks, redirecionamentos e links enviados ao usuário devem vir de uma configuração conhecida ou de uma lista explícita de hosts permitidos, definida na aplicação ou na infraestrutura.

### Autorização e identificadores

Existe ainda outra fronteira que aparece quando o frontend envia IDs de recursos, como o ID de uma fatura, de um pedido, de um usuário ou de uma organização. A interface pode até esconder links, bloquear rotas ou remover botões com base nas permissões do usuário, mas essas decisões apenas organizam a experiência da interface. Elas não comprovam que a pessoa autenticada tem permissão para acessar ou modificar o recurso solicitado.

```http
GET /api/tenants/tenant-b/invoices/8472 HTTP/1.1
Host: api.exemplo.com
Cookie: session=usuario-a
```

Nesse exemplo, a URL identifica tanto a organização `tenant-b` quanto a fatura `8472`. Se a API confiar apenas nesses valores, alterar um deles pode permitir que o usuário acesse uma fatura pertencente a outra organização. Por isso, cada endpoint que recebe um ID do frontend precisa verificar novamente quem é o usuário autenticado, a qual organização ele pertence, qual recurso está tentando acessar e se possui permissão para executar aquela ação. IDs aleatórios ou difíceis de adivinhar tornam a enumeração mais difícil, mas não substituem a **autorização** sobre o recurso. Essa é a fronteira entre uma regra aplicada na interface e a prevenção de Broken Access Control, IDOR ou **[BOLA][10]** no backend.

Depois que o backend autoriza a operação e produz a resposta, outra decisão precisa ser preservada ao longo do caminho: onde esse conteúdo pode ser armazenado? Uma página que varia conforme a sessão, as permissões ou a organização do usuário não deve receber a mesma política de cache de uma página pública. Quando a resposta não puder ser armazenada, essa restrição deve ser declarada explicitamente:

```http
Cache-Control: no-store
```

A diretiva `no-store` informa aos caches privados, como o cache do navegador, e aos caches compartilhados, como uma CDN, que aquela resposta não deve ser armazenada. Nesse caso, combiná-la com `private` seria redundante. A diretiva `private` é útil em outro cenário: quando a resposta pode permanecer no cache do próprio usuário, mas não pode ser reutilizada por uma CDN ou por qualquer outro cache compartilhado. Se esse conteúdo puder ficar armazenado no navegador, mas precisar ser validado novamente com o servidor antes de cada uso, uma política possível é:

```http
Cache-Control: private, no-cache
```

Quando a resposta pode ser armazenada, o `Vary` ajuda o cache a distinguir versões diferentes do mesmo conteúdo ao indicar quais headers da requisição influenciaram o resultado. Ele não substitui, porém, a decisão de impedir que conteúdo autenticado seja armazenado e compartilhado pela CDN. Rotas privadas precisam de uma regra explícita de bypass ou de diretivas compatíveis com o comportamento esperado, conforme a **[semântica de cache do HTTP][11]**. Assim como ocorre com os headers de encaminhamento, o contexto usado para produzir uma resposta privada precisa ser preservado até o navegador, sem permitir que ela seja tratada como conteúdo público ou reutilizável por outros usuários.

## Service Worker

Um service worker é um script que o navegador registra para uma aplicação e que é iniciado quando precisa responder a determinados eventos, separado da página e do ciclo de renderização. Ele pode ser encerrado quando fica ocioso e reiniciado quando um novo evento acontece. O papel dele é atuar em tarefas como interceptar requisições, responder com conteúdo em cache, sincronizar dados e tornar a aplicação mais resiliente em conexões instáveis ou indisponíveis.

Depois de registrado e ativado, o service worker passa a atuar dentro de uma origem e de um escopo específico. Esse escopo determina quais páginas ele consegue controlar. Um worker registrado em `/app/` só interfere nas páginas abaixo desse caminho. Um worker registrado em `/` pode alcançar grande parte da aplicação. Essa diferença importa porque, ao interceptar uma requisição, o worker passa a participar do caminho entre a página e a rede.

```js
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open("runtime").then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      await cache.put(event.request, response.clone());

      return response;
    })
  );
});
```

Esse exemplo registra um handler para o evento `fetch`. Ou seja, sempre que uma página controlada pelo service worker faz uma requisição `GET`, o worker procura uma resposta correspondente no `Cache Storage`. Se ele encontra, devolve a resposta armazenada. Se não encontra, faz a requisição à rede, salva uma cópia da resposta e a retorna para a página.

Essa implementação parece conveniente, mas trata todo `GET` como cacheável. Um asset, uma página pública e uma resposta de `/api/me` passam pelo mesmo caminho. O `Cache Storage` armazena pares de requisição e resposta; ele não identifica sozinho se uma resposta depende da sessão, autorização ou tenant. Essa classificação precisa estar explícita no código do worker.

O **[CVE-2024-1554][7]** no Firefox ilustra o risco de uma chave de cache que não representa completamente o contexto da requisição. Nesse caso, as requisições feitas via `fetch()` e navegação entre páginas puderam compartilhar a mesma entrada de cache porque certos headers opcionais do `fetch()` não participavam da composição da cache key. O resultado era uma forma de cache poisoning local: um atacante conseguia preparar uma resposta para determinada URL e, em uma visita posterior à mesma URL, o navegador podia reutilizar aquela resposta no lugar da resposta correta.

A estratégia de [cache do service worker][6] não é a mesma coisa que HTTP caching. No HTTP caching, o navegador e caches intermediários seguem headers como `Cache-Control` e `Vary`. No service worker, é o código da aplicação que decide se uma requisição passa pelo cache, pela rede ou por uma combinação dos dois. A MDN descreve essas estratégias de cache, como `cache first`, quando o worker consulta o cache antes da rede, e `network first`, quando busca a rede primeiro e usa o cache como fallback.

O ciclo de atualização do worker também faz parte dessa superfície de segurança. Uma versão antiga do worker pode continuar ativa até que uma nova seja instalada, ativada e passe a controlar as páginas abertas. Se uma correção altera as regras de cache, rotas ou tratamento de sessão, a versão nova precisa remover caches antigos no evento `activate` e assumir controle dos clientes de forma coordenada. Caso contrário, uma regra já corrigida no código pode continuar produzindo efeitos por meio dos caches criados pela versão anterior.

[6]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching "Caching strategies - MDN"
[7]: https://nvd.nist.gov/vuln/detail/CVE-2024-1554 "CVE-2024-1554 Detail - NVD"

## CDN

A CDN fica entre o navegador e a aplicação e é uma infraestrutura externa que toma decisões antes da requisição chegar ao backend. Dependendo da configuração, ela pode responder diretamente à requisição, alterar headers, aplicar rewrites ou executar funções dentro de sua infraestrutura.

O primeiro cuidado é classificar o tráfego de acordo com o comportamento real de cada rota, e não apenas com o formato da URL. Essa separação precisa estar representada nas regras da CDN:

```text
/assets/app.8f31a.js     → asset versionado
/pricing                 → página pública
/dashboard               → página autenticada
/api/me                  → resposta por usuário
```

Uma regra ampla como *“aplicar cache a tudo que termina em `.css` ou `.js`”* pode classificar mal uma requisição. Da mesma forma, uma regra baseada apenas em prefixos pode continuar atingindo rotas cujo comportamento mudou depois de uma alteração no produto. Como a CDN toma decisões antes da origem, suas configurações precisam acompanhar as mudanças de arquitetura e entre as versões da aplicação.

Rewrites e funções executadas na CDN exigem o mesmo cuidado. Se uma regra na CDN altera `path`, `headers`, `cookies` ou `origin`, o backend passa a receber uma requisição diferente da original. Essas transformações precisam ser logadas em ferramentas de observabilidade porque afetam roteamento, autenticação e autorização.

Um caso público que mostra esse impacto foi um incidente na [Cloudflare][5], causado por um bug no parser HTML usado por recursos como `Email Obfuscation`, `Server-side Excludes` e `Automatic HTTPS Rewrites`. Em certas respostas HTTP, os servidores da empresa retornavam trechos de memória que podiam conter cookies, tokens de autenticação, `body` de requisições POST e outros dados sensíveis. Parte desse conteúdo foi armazenada pelos mecanismos normais de crawling e cache de mecanismos de busca, prolongando a exposição mesmo depois que a falha na CDN havia sido interrompida. A resposta ao incidente exigiu também localizar e remover cópias que já haviam sido distribuídas.

A invalidação é a outra parte desse controle. Se uma página muda de pública para autenticada, se uma regra de cache é corrigida ou se uma resposta sensível foi armazenada por engano, publicar uma nova versão do frontend não remove automaticamente o conteúdo já distribuído pela CDN. A invalidação precisa acompanhar a mudança. Aqui entram diretivas como `stale-while-revalidate`, `stale-if-error` ou configurações equivalentes do provedor, que também precisam ser tratadas de acordo com a rota. Elas podem ser adequadas para rotas públicas e assets, mas prolongam a reutilização de respostas e não substituem uma invalidação. A configuração da CDN deve deixar explícito quais rotas podem ser respondidas pelo edge, por quanto tempo e sob quais condições.

## Conclusão

Resumindo, a segurança de uma aplicação web depende da coerência entre navegador, HTTP, CDN, BFF e APIs. Cada fronteira precisa definir o que aceita, o que transforma, o que armazena e o que revalida. O trabalho da arquitetura é acompanhar o dado ao longo desse percurso: entender de onde ele vem, quem pode acessá-lo, quais transformações sofre, onde permanece armazenado, quais políticas do navegador se aplicam e qual camada possui autoridade para decidir a próxima ação. Ao projetar uma aplicação, o engenheiro de frontend precisa ir além dos fluxos de interface e compreender como cada componente participa dessas decisões de segurança.

Uma boa arquitetura no frontend responde a perguntas como:

* quais origens podem abrir, embutir, ler ou enviar mensagens para a aplicação?
* quais scripts executam na mesma origem do produto?
* quais dados ficam em cookies, estado em memória, `sessionStorage`, `localStorage`, IndexedDB e Cache Storage?
* quais headers são enviados pelo cliente e quais são definidos pela infraestrutura?
* quais rotas variam por sessão, autorização, tenant, idioma ou feature flag?
* quais operações que alteram estado usam cookies de sessão e como o backend valida o contexto da requisição?
* quais APIs recebem identificadores vindos do frontend?
* onde usuário, recurso, ação e tenant são revalidados?
* quais componentes transformam texto em HTML, atributos, URLs ou outro conteúdo interpretável pelo navegador?

---

## TLDR

* O frontend participa da segurança porque executa código, mantém estado, chama APIs e compõe recursos de várias origens.
* O navegador controla origem, cookies, CORS, CSP, storage, permissões e comunicação entre documentos, mas CORS e controles visuais não substituem autorização ou proteção contra CSRF no backend.
* XSS surge quando um conteúdo que deveria permanecer como texto passa a ser interpretado como HTML, atributo, URL ou comportamento executável no DOM.
* IDs, tenants e outros identificadores enviados pelo frontend precisam ter sua autorização revalidada no backend para cada usuário, recurso e ação.
* Service workers precisam classificar explicitamente o que pode ser armazenado, porque o Cache Storage não compreende sozinho o contexto de sessão ou autorização.
* HTTP e CDN precisam preservar a semântica da resposta: conteúdo privado não pode se tornar compartilhável por erro de cache, header ou regra executada no edge.
* Uma arquitetura segura explicita onde cada dado entra, quem o transforma, onde ele permanece armazenado e em qual camada a confiança é revalidada.

[1]: https://angular.dev/api/platform-browser/DomSanitizer "DomSanitizer • Angular"
[2]: https://omergil.blogspot.com/2017/02/web-cache-deception-attack.html "Vulnerabilidade no PayPal"
[3]: https://github.com/angular/angular/security/advisories/GHSA-g93w-mfhg-p222 "XSS in i18n attribute bindings · Advisory · angular/angular · GitHub"
[4]: https://github.com/sveltejs/svelte/security/advisories/GHSA-f7gr-6p89-r883 "Cross-site scripting via spread attributes in Svelte SSR · Advisory · sveltejs/svelte · GitHub"
[5]: https://blog.cloudflare.com/incident-report-on-memory-leak-caused-by-cloudflare-parser-bug/ "Incident report on memory leak caused by Cloudflare parser bug"

[8]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies "Using HTTP cookies - MDN"
[9]: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF "Cross-site request forgery - MDN"
[10]: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/ "API1:2023 Broken Object Level Authorization - OWASP"
[11]: https://www.rfc-editor.org/rfc/rfc9111.html "RFC 9111: HTTP Caching"
[12]: https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html "Software Supply Chain Security - OWASP"
