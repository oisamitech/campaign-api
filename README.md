# API Template

## 🚀 Propósito do Projeto

**Este projeto foi criado para esculpir e chegar em um consenso com o time de engenharia para podermos entregar as melhores práticas de desenvolvimento para a Sami. O objetivo é estabelecer um padrão de qualidade, produtividade e observabilidade em nossos serviços de API.**

---

Boilerplate profissional de API com TypeScript, Fastify, Vitest, MySQL e OpenTelemetry.

## Funcionalidades

- **TypeScript** - JavaScript com tipagem forte
- **Fastify** - Framework web rápido e leve
- **MySQL** - Banco de dados relacional com pool de conexões
- **Zod** - Validação de schemas para requisições e respostas
- **OpenTelemetry** - Rastreamento distribuído e métricas
- **Swagger/OpenAPI** - Documentação da API
- **Vitest** - Framework de testes rápido com relatórios de cobertura
- **Docker** - Containerização para fácil implantação
- **Biome** - Linter e formatação de código (substitui ESLint & Prettier)
- **Husky** - Git hooks para qualidade de código
- **Commitlint** - Validação de mensagens de commit
- **Lockfile-lint** - Validação de segurança do arquivo de lock
- **SonarQube** - Análise estática de código e qualidade
- **GitHub Templates** - Template de Pull Request padronizado
- **GitHub Workflows** - Automação de dependências entre issues

## Estrutura do Projeto

```
api-template/
├── src/
│   ├── config/           # Configuração da aplicação
│   ├── controllers/      # Manipuladores de requisições
│   ├── database/         # Conexão com banco de dados e migrações
│   │   └── migrations/   # Arquivos SQL de migração
│   ├── repositories/     # Camada de acesso a dados
│   ├── routes/           # Rotas da API
│   ├── schemas/          # Schemas de validação
│   ├── services/         # Lógica de negócios
│   ├── telemetry/        # Configuração do OpenTelemetry
│   ├── app.ts            # Configuração do app Fastify
│   └── index.ts          # Ponto de entrada da aplicação
├── test/
│   ├── integration/      # Testes de integração
│   ├── mocks/            # Mocks para testes
│   ├── unit/             # Testes unitários
│   └── setup.ts          # Configuração dos testes
├── .husky/               # Git hooks do Husky
├── .github/              # Configurações do GitHub
│   ├── workflows/        # GitHub Actions
│   └── pull_request_template.md # Template de PR
├── .env                  # Variáveis de ambiente
├── .env.example          # Exemplo de variáveis de ambiente
├── .env.test             # Variáveis de ambiente para testes
├── biome.json            # Configuração do Biome
├── commitlint.config.ts  # Configuração do Commitlint
├── docker-compose.yml    # Configuração do Docker Compose
├── Dockerfile            # Configuração do Docker
├── package.json          # Dependências do projeto
├── sonar-project.properties # Configuração do SonarQube
├── tsconfig.json         # Configuração do TypeScript
└── vitest.config.ts      # Configuração do Vitest
```

## Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Docker e Docker Compose (para desenvolvimento em containers)

### Configuração de Desenvolvimento Local

1. Clone o repositório:

```bash
git clone <url-do-repositorio>
cd api-template
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

4. Inicie o banco de dados MySQL:

```bash
docker-compose up -d mysql
```

5. Execute as migrações do banco de dados:

```bash
npm run migrate:up
```

6. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

### Configuração com Docker

Para executar toda a pilha de aplicações com Docker:

```bash
docker-compose up -d
```

Isso iniciará a API, o banco de dados MySQL e o Jaeger para visualização do OpenTelemetry.

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento com recarga automática
- `npm run build` - Compila a aplicação para produção
- `npm run start` - Inicia o servidor de produção
- `npm run test` - Executa os testes
- `npm run test:watch` - Executa os testes em modo de observação
- `npm run test:cov` - Executa os testes com relatório de cobertura
- `npm run lint` - Verifica erros de linting com Biome
- `npm run lint:fix` - Corrige erros de linting com Biome
- `npm run lint:lockfile` - Valida o arquivo de lock (package-lock.json)
- `npm run format` - Formata o código com Biome
- `npm run migrate:up` - Executa as migrações do banco de dados
- `npm run migrate:down` - Reverte a última migração do banco de dados
- `npm run commitlint` - Valida mensagens de commit

## Qualidade de Código

### Biome

Este projeto utiliza o **Biome** como ferramenta principal para linting e formatação de código. O Biome é uma ferramenta moderna e rápida que substitui ESLint e Prettier.

**Configurações principais:**
- Formatação com tabs e aspas simples
- Regras de linting recomendadas
- Organização automática de imports
- Configurações específicas para TypeScript

### Git Hooks com Husky

O projeto inclui hooks do Git configurados com Husky para garantir qualidade de código:

- **commit-msg**: Valida o formato das mensagens de commit usando Commitlint
- **pre-commit**: (configurável) Pode executar linting e testes antes do commit

### Commitlint

As mensagens de commit seguem o padrão **Conventional Commits**:

```
type(scope): description

feat: add new user endpoint
fix(auth): resolve token validation issue
docs: update API documentation
```

### Lockfile-lint

O projeto utiliza **lockfile-lint** para validar a segurança do arquivo `package-lock.json`:

- **Validação HTTPS**: Garante que todas as dependências sejam baixadas via HTTPS
- **Hosts permitidos**: Restringe downloads apenas de fontes confiáveis (npm, npm.pkg.github.com)
- **Segurança**: Previne ataques de supply chain através de validação de integridade

**Configuração:**
```json
{
  "lockfile-lint": {
    "path": "package-lock.json",
    "type": "npm",
    "validate-https": true,
    "allowed-hosts": ["npm", "npm.pkg.github.com"]
  }
}
```

### Cobertura de Testes

O projeto mantém um padrão alto de qualidade com cobertura mínima de 90% para:
- Linhas de código
- Funções
- Branches
- Statements

## Documentação da API

A documentação da API é gerada automaticamente usando Swagger/OpenAPI e está disponível em:

```
http://localhost:3000/documentation
```

## OpenTelemetry

Este projeto inclui OpenTelemetry para rastreamento distribuído e métricas. Por padrão, os rastreamentos são enviados para o Jaeger e as métricas são expostas via Prometheus.

### Acessando Dados de Telemetria

- **Interface Jaeger**: http://localhost:16686
- **Métricas Prometheus**: http://localhost:9464/metrics

### Configuração

O OpenTelemetry pode ser configurado através de variáveis de ambiente:

- `OTEL_ENABLED` - Ativar/desativar OpenTelemetry (padrão: true)
- `OTEL_SERVICE_NAME` - Nome do serviço para telemetria (padrão: api-template)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Endpoint OTLP para rastreamentos (padrão: http://localhost:4318)
- `OTEL_EXPORTER_PROMETHEUS_PORT` - Porta para métricas Prometheus (padrão: 9464)

## Testes

Este projeto utiliza Vitest para testes. Os testes estão organizados em:

- **Testes Unitários**: Testam funções e classes individuais isoladamente
- **Testes de Integração**: Testam endpoints da API com um banco de dados real

### Executando Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo de observação
npm run test:watch

# Gerar relatório de cobertura
npm run test:cov
```

O relatório de cobertura estará disponível no diretório `coverage`.

### Configuração de Testes

- **Cobertura mínima**: 90% para linhas, funções, branches e statements
- **Relatórios**: Text, JSON, LCOV, HTML e SonarQube
- **Setup automático**: Configuração de ambiente de teste em `test/setup.ts`

## Análise de Qualidade com SonarQube

O projeto está configurado para integração com SonarQube para análise estática de código:

- **Relatório de cobertura**: Integração automática com relatórios LCOV
- **Análise de código**: Detecção de bugs, vulnerabilidades e code smells
- **Métricas de qualidade**: Complexidade ciclomática, duplicação de código, etc.

### Configuração do SonarQube

Configure as variáveis de ambiente necessárias:
- `SONAR_PROJECT_NAME` - Nome do projeto no SonarQube
- `SONAR_TOKEN` - Token de autenticação do SonarQube

## Endpoints de Exemplo

A API inclui uma implementação CRUD completa para usuários:

- `GET /users` - Obter todos os usuários
- `GET /users/:id` - Obter um usuário por ID
- `POST /users` - Criar um novo usuário
- `PUT /users/:id` - Atualizar um usuário existente
- `DELETE /users/:id` - Excluir um usuário

## Workflow de Desenvolvimento

1. **Criar branch**: `git checkout -b feature/nova-funcionalidade`
2. **Desenvolver**: Implementar funcionalidade seguindo padrões do projeto
3. **Testar**: Executar testes e garantir cobertura mínima
4. **Linting**: Verificar qualidade de código com `npm run lint`
5. **Commit**: Usar mensagem no formato Conventional Commits
6. **Push**: Enviar para repositório remoto
7. **Pull Request**: Criar PR usando o template padronizado

## GitHub Templates e Workflows

### Template de Pull Request

O projeto inclui um template padronizado para Pull Requests que garante:

- **Descrição clara** da funcionalidade implementada
- **Link para tarefa** do ClickUp
- **Tipo de mudança** categorizada (feature, bug fix, etc.)
- **Dependências** entre PRs documentadas

### Workflow de Dependent Issues

Automação para gerenciar dependências entre issues e pull requests:

- **Verificação automática** de dependências
- **Atualização de status** quando dependências são resolvidas
- **Execução diária** para verificar cross-repository issues
- **Integração** com sistema de automação da Sami

## Licença

MIT
