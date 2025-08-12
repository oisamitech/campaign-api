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

## Exemplos com JavaScript/Node.js

### 1. Função para Listar Campanhas com Paginação

```javascript
async function listCampaigns(page = 1, limit = 10) {
  try {
    const response = await fetch(
      `http://localhost:3000/campaigns?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Erro ao listar campanhas:', error)
    throw error
  }
}

// Uso
listCampaigns(1, 5)
  .then(result => {
    console.log('Campanhas:', result.data)
    console.log('Metadados:', result.meta)
  })
  .catch(error => {
    console.error('Erro:', error)
  })
```

### 2. Função para Navegar por Todas as Páginas

```javascript
async function getAllCampaigns(limit = 10) {
  let allCampaigns = []
  let currentPage = 1
  let hasNextPage = true

  while (hasNextPage) {
    try {
      const result = await listCampaigns(currentPage, limit)

      allCampaigns = allCampaigns.concat(result.data)
      hasNextPage = result.meta.hasNextPage
      currentPage++

      console.log(
        `Página ${result.meta.currentPage} carregada com ${result.data.length} campanhas`
      )
    } catch (error) {
      console.error(`Erro ao carregar página ${currentPage}:`, error)
      break
    }
  }

  return allCampaigns
}

// Uso
getAllCampaigns(20).then(campaigns => {
  console.log(`Total de campanhas carregadas: ${campaigns.length}`)
})
```

### 3. Função para Buscar Campanhas com Filtros (Exemplo Futuro)

```javascript
async function searchCampaigns(filters = {}, page = 1, limit = 10) {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    })

    const response = await fetch(
      `http://localhost:3000/campaigns/search?${queryParams}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error)
    throw error
  }
}

// Uso (quando implementado)
searchCampaigns(
  {
    isDefault: true,
    minValue: 10,
  },
  1,
  20
).then(result => {
  console.log('Campanhas encontradas:', result.data)
})
```

## Exemplos com Python

### 1. Função para Listar Campanhas

```python
import requests
import json

def list_campaigns(page=1, limit=10):
    try:
        url = f"http://localhost:3000/campaigns"
        params = {"page": page, "limit": limit}

        response = requests.get(url, params=params)
        response.raise_for_status()

        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Erro ao listar campanhas: {e}")
        raise

# Uso
try:
    result = list_campaigns(page=1, limit=5)
    print(f"Campanhas encontradas: {len(result['data'])}")
    print(f"Total de páginas: {result['meta']['totalPages']}")

    for campaign in result['data']:
        print(f"- {campaign['name']} (ID: {campaign['id']})")

except Exception as e:
    print(f"Erro: {e}")
```

### 2. Função para Navegar por Todas as Páginas

```python
def get_all_campaigns(limit=10):
    all_campaigns = []
    current_page = 1
    has_next_page = True

    while has_next_page:
        try:
            result = list_campaigns(current_page, limit)

            all_campaigns.extend(result['data'])
            has_next_page = result['meta']['hasNextPage']
            current_page += 1

            print(f"Página {result['meta']['currentPage']} carregada com {len(result['data'])} campanhas")

        except Exception as e:
            print(f"Erro ao carregar página {current_page}: {e}")
            break

    return all_campaigns

# Uso
campaigns = get_all_campaigns(20)
print(f"Total de campanhas carregadas: {len(campaigns)}")
```

## Exemplos com Postman

### 1. Collection para Campaign API

Crie uma nova collection no Postman com as seguintes requests:

**Listar Campanhas (Padrão)**

- Method: GET
- URL: `http://localhost:3000/campaigns`

**Listar Campanhas (Página 2)**

- Method: GET
- URL: `http://localhost:3000/campaigns?page=2&limit=5`

**Listar Campanhas (Limite 20)**

- Method: GET
- URL: `http://localhost:3000/campaigns?limit=20`

**Health Check**

- Method: GET
- URL: `http://localhost:3000/health`

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no Postman:

```
base_url: http://localhost:3000
api_version: v1
```

### 3. Testes Automatizados

Adicione os seguintes testes no Postman:

```javascript
// Teste para verificar se a resposta tem a estrutura correta
pm.test('Response has correct structure', function () {
  const response = pm.response.json()

  pm.expect(response).to.have.property('success')
  pm.expect(response).to.have.property('data')
  pm.expect(response).to.have.property('meta')

  pm.expect(response.success).to.be.true
  pm.expect(response.data).to.be.an('array')
  pm.expect(response.meta).to.be.an('object')
})

// Teste para verificar metadados de paginação
pm.test('Pagination metadata is correct', function () {
  const response = pm.response.json()
  const meta = response.meta

  pm.expect(meta).to.have.property('currentPage')
  pm.expect(meta).to.have.property('totalPages')
  pm.expect(meta).to.have.property('totalItems')
  pm.expect(meta).to.have.property('itemsPerPage')
  pm.expect(meta).to.have.property('hasNextPage')
  pm.expect(meta).to.have.property('hasPreviousPage')

  pm.expect(meta.currentPage).to.be.a('number')
  pm.expect(meta.totalPages).to.be.a('number')
  pm.expect(meta.totalItems).to.be.a('number')
  pm.expect(meta.itemsPerPage).to.be.a('number')
  pm.expect(meta.hasNextPage).to.be.a('boolean')
  pm.expect(meta.hasPreviousPage).to.be.a('boolean')
})
```

## Dicas de Uso

### 1. Performance

- Use limites apropriados para sua aplicação (10-50 itens por página é geralmente ideal)
- Implemente cache no cliente para evitar requisições desnecessárias
- Considere usar `limit=100` apenas quando necessário carregar muitos dados de uma vez

### 2. Tratamento de Erros

- Sempre verifique o campo `success` na resposta
- Implemente retry logic para erros temporários
- Trate erros de validação (400) e erros do servidor (500) adequadamente

### 3. Navegação

- Use os metadados `hasNextPage` e `hasPreviousPage` para controlar a navegação
- Implemente controles de paginação na interface do usuário
- Considere mostrar o total de itens e páginas para melhor UX

### 4. Monitoramento

- Monitore o tempo de resposta das requisições
- Implemente logging para debug de problemas de paginação
- Use as informações de `uptime` e `database.status` para monitoramento de saúde
