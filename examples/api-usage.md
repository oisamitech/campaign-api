# Exemplos de Uso da Campaign API

## Autenticação

A API usa autenticação Bearer Token. Todas as rotas protegidas requerem o header `Authorization` com o formato:

```
Authorization: Bearer <seu-token-aqui>
```

### Configuração do Token

O token deve ser configurado na variável de ambiente `BEARER_AUTH_KEY`. Você pode configurar múltiplos tokens separando-os por vírgula:

```bash
BEARER_AUTH_KEY=token1,token2,token3
```

## Exemplos com cURL

### 1. Listar Primeira Página (Padrão)

```bash
curl -X GET "http://localhost:3000/api/campaigns" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer seu-token-aqui"
```

**Resposta esperada:**

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Campanha de Verão 2024",
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-08-31T23:59:59.999Z",
      "isDefault": false,
      "minLives": 1,
      "maxLives": 10,
      "plans": [1, 2, 3, 4],
      "value": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### 2. Tentativa de Acesso sem Token

```bash
curl -X GET "http://localhost:3000/api/campaigns" \
  -H "Accept: application/json"
```

**Resposta esperada (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 3. Tentativa de Acesso com Token Inválido

```bash
curl -X GET "http://localhost:3000/api/campaigns" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer token-invalido"
```

**Resposta esperada (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

### 4. Listar com Paginação Personalizada

```bash
curl -X GET "http://localhost:3000/api/campaigns?page=2&limit=5" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer seu-token-aqui"
```

**Resposta esperada:**

```json
{
  "success": true,
  "data": [
    {
      "id": "6",
      "name": "Campanha 6",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z",
      "isDefault": false,
      "minLives": 1,
      "maxLives": 5,
      "plans": [1, 2],
      "value": 10,
      "createdAt": "2024-01-06T00:00:00.000Z",
      "updatedAt": "2024-01-06T00:00:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 2,
    "totalPages": 3,
    "totalItems": 15,
    "itemsPerPage": 5,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

### 5. Health Check (Não Requer Autenticação)

```bash
curl -X GET "http://localhost:3000/api/health" \
  -H "Accept: application/json"
```

**Resposta esperada:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "online",
    "provider": "mysql",
    "responseTime": "5ms"
  }
}
```

## Códigos de Status HTTP

- **200 OK**: Requisição bem-sucedida
- **400 Bad Request**: Erro de validação nos parâmetros
- **401 Unauthorized**: Token de autenticação ausente ou inválido
- **500 Internal Server Error**: Erro interno do servidor

## Estrutura de Resposta de Erro

Todas as respostas de erro seguem o padrão:

```json
{
  "statusCode": 400,
  "success": false,
  "error": "Tipo do Erro",
  "message": "Descrição detalhada do erro"
}
```

## Documentação da API

A documentação completa da API está disponível em:

```
http://localhost:3000/documentation
```

Esta interface Swagger permite testar todas as rotas diretamente no navegador.
