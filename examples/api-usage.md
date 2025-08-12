# Exemplos de Uso da Campaign API

## Exemplos com cURL

### 1. Listar Primeira Página (Padrão)

```bash
curl -X GET "http://localhost:3000/campaigns" \
  -H "Accept: application/json"
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

### 2. Listar com Paginação Personalizada

```bash
curl -X GET "http://localhost:3000/campaigns?page=2&limit=5" \
  -H "Accept: application/json"
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

### 3. Listar com Limite Personalizado

```bash
curl -X GET "http://localhost:3000/campaigns?limit=20" \
  -H "Accept: application/json"
```

### 4. Health Check

```bash
curl -X GET "http://localhost:3000/health" \
  -H "Accept: application/json"
```