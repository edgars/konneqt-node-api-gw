# API Gateway com Rate Limit, Proxy e Suporte a CORS

Este é um projeto de **API Gateway** utilizando [Fastify](https://www.fastify.io/), com as seguintes funcionalidades:

-   **Proxy para APIs externas** configurado no arquivo `routes.json`.
-   **Rate Limit por rota** para limitar o número de requisições por cliente.
-   **CORS Global e Específico por Rota**, permitindo controle flexível de políticas de segurança para requisições cross-origin.
-   **Middleware de Segurança** com Helmet.

----------

## Funcionalidades Principais

1.  **Proxy para APIs Externas**  
    Direcione requisições para endpoints externos, mapeando URLs locais para APIs externas.
    
2.  **Rate Limit Configurável por Rota**  
    Limite a quantidade de requisições por IP em um determinado intervalo de tempo.
    
3.  **CORS Global e por Rota**  
    Controle requisições cross-origin com configuração global ou específica por rota.
    
4.  **Helmet**  
    Proteção contra vulnerabilidades conhecidas por meio de cabeçalhos HTTP seguros.
    

----------

## Instalação

### Pré-requisitos

-   **Node.js** versão 14 ou superior.
-   **NPM** ou **Yarn** instalado no ambiente.

### Passos para Instalar

1.  Clone o repositório:
    
    bash
    
    CopyEdit
    
    `git clone https://github.com/seu-repositorio/fastify-api-gateway.git
    cd fastify-api-gateway` 
    
2.  Instale as dependências:
    
    bash
    
    CopyEdit
    
    `npm install` 
    
3.  Inicie o servidor:
    
    bash
    
    CopyEdit
    
    `npm start` 
    
4.  Para desenvolvimento com hot-reload (usando **nodemon**):
    
    bash
    
    CopyEdit
    
    `npm run dev` 
    

----------

## Configuração

Toda a configuração de rotas, CORS e Rate Limit é feita no arquivo `routes.json`.

### Estrutura do `routes.json`

Aqui está um exemplo completo do `routes.json`:

json

CopyEdit

`{
  "cors": {
    "enabled": true,
    "origin": "*",
    "methods": ["GET", "POST", "PUT", "DELETE"]
  },
  "routes": [
    {
      "method": "GET",
      "url": "/api/users",
      "proxy": {
        "target": "https://jsonplaceholder.typicode.com/users"
      },
      "rateLimit": {
        "max": 50,
        "timeWindow": "1 minute"
      }
    },
    {
      "method": "POST",
      "url": "/api/posts",
      "proxy": {
        "target": "https://jsonplaceholder.typicode.com/posts"
      },
      "rateLimit": {
        "max": 20,
        "timeWindow": "1 minute"
      },
      "cors": false
    }
  ]
}` 

### Descrição das Configurações

1.  **CORS Global (Top-Level)**:
    
    -   `cors.enabled`: Habilita ou desabilita o CORS global.
    -   `cors.origin`: Define quais domínios podem acessar o API Gateway (`*` para todos os domínios).
    -   `cors.methods`: Especifica os métodos HTTP permitidos globalmente.
2.  **Rotas**:
    
    -   `method`: Método HTTP da rota (`GET`, `POST`, etc.).
    -   `url`: Caminho acessível pelo API Gateway.
    -   `proxy.target`: URL do endpoint externo que será acessado pela rota.
    -   `rateLimit`: Configuração de limites de requisição por rota:
        -   `max`: Número máximo de requisições por IP.
        -   `timeWindow`: Janela de tempo para o limite.
    -   `cors`: Configuração específica para a rota:
        -   `true`: Habilita o CORS para a rota (sobrescreve a configuração global).
        -   `false`: Desabilita o CORS para a rota.

----------

## Teste do Projeto

1.  Use ferramentas como **Postman**, **Insomnia**, ou um navegador para enviar requisições às rotas definidas.
    
2.  Exemplos de requisições:
    
    -   **GET** `http://localhost:3000/api/users`
        -   Proxy para a API externa `https://jsonplaceholder.typicode.com/users`.
    -   **POST** `http://localhost:3000/api/posts`
        -   Proxy para a API externa `https://jsonplaceholder.typicode.com/posts`.
    -   CORS e Rate Limit serão aplicados conforme a configuração.
3.  **Testando Rate Limit**:
    
    -   Tente enviar mais requisições do que o limite definido (`max`) no intervalo especificado (`timeWindow`) e veja a resposta de erro.
4.  **Testando CORS**:
    
    -   Envie requisições cross-origin e veja como o CORS se comporta, dependendo da configuração no `routes.json`.

----------

## Estrutura do Projeto


```
fastify-api-gateway/
├── routes.json          # Configuração de rotas, CORS e Rate Limit
├── server.js            # Código principal do servidor
├── package.json         # Configurações do projeto e dependências
├── README.md            # Documentação
└── node_modules/        # Módulos instalados`
``` 

----------

## Scripts Disponíveis

### `npm start`

Inicia o servidor em ambiente de produção.

### `npm run dev`

Inicia o servidor em modo de desenvolvimento com **hot-reload** usando o `nodemon`.

----------

