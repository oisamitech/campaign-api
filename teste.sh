#!/bin/bash

# Script de teste automatizado para a API de campanhas
# Este script constrói e executa testes em um container Docker com MySQL

set -e  # Para o script se qualquer comando falhar

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para limpeza em caso de erro ou interrupção
cleanup() {
    log "Executando limpeza..."
    
    # Para e remove o container da API se existir
    if docker ps -a --format "table {{.Names}}" | grep -q "campaign-api-test"; then
        log "Parando e removendo container da API..."
        docker stop campaign-api-test 2>/dev/null || true
        docker rm campaign-api-test 2>/dev/null || true
    fi
    
    # Para e remove o container do MySQL se existir
    if docker ps -a --format "table {{.Names}}" | grep -q "campaign-mysql-test"; then
        log "Parando e removendo container do MySQL..."
        docker stop campaign-mysql-test 2>/dev/null || true
        docker rm campaign-mysql-test 2>/dev/null || true
    fi
    
    # Remove a rede se existir
    if docker network ls --format "table {{.Name}}" | grep -q "campaign-test-network"; then
        log "Removendo rede de teste..."
        docker network rm campaign-test-network 2>/dev/null || true
    fi
    
    # Remove volumes se existirem
    if docker volume ls --format "table {{.Name}}" | grep -q "mysql_test_data"; then
        log "Removendo volume de dados do MySQL..."
        docker volume rm mysql_test_data 2>/dev/null || true
    fi
    
    # Remove arquivo .env.test temporário se existir
    if [ -f ".env.test" ]; then
        log "Removendo arquivo .env.test temporário..."
        rm -f .env.test
    fi
    
    log_success "Limpeza concluída"
}

# Configurar trap para executar cleanup em caso de erro ou interrupção
trap cleanup EXIT INT TERM

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    log_error "Docker não está rodando. Por favor, inicie o Docker e tente novamente."
    exit 1
fi

# Verificar se docker-compose está disponível
if ! command -v docker-compose >/dev/null 2>&1; then
    log_error "docker-compose não está instalado. Por favor, instale o docker-compose e tente novamente."
    exit 1
fi

log "Iniciando processo de teste automatizado..."

# Criar rede para os testes
log "Criando rede de teste..."
docker network create campaign-test-network 2>/dev/null || log_warning "Rede já existe"

# Iniciar MySQL para testes
log "Iniciando container do MySQL para testes..."
docker run -d \
    --name campaign-mysql-test \
    --network campaign-test-network \
    -e MYSQL_ROOT_PASSWORD=rootpassword \
    -e MYSQL_DATABASE=campaigns \
    -e MYSQL_USER=testuser \
    -e MYSQL_PASSWORD=testpass \
    -p 3307:3306 \
    --health-cmd="mysqladmin ping -h localhost -u root -prootpassword" \
    --health-interval=10s \
    --health-timeout=5s \
    --health-retries=5 \
    mysql:8.0

# Aguardar MySQL estar saudável
log "Aguardando MySQL estar pronto..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker exec campaign-mysql-test mysqladmin ping -h localhost -u root -prootpassword >/dev/null 2>&1; then
        log_success "MySQL está pronto!"
        break
    fi
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        log_error "Timeout aguardando MySQL estar pronto"
        exit 1
    fi
done

# Construir imagem da API para testes
log "Construindo imagem da API para testes..."
docker build -f Dockerfile.local -t campaign-api-test .

# Executar container da API e executar testes
log "Executando testes..."
docker run --rm \
    --name campaign-api-test \
    --network campaign-test-network \
    -e NODE_ENV=test \
    -e DATABASE_URL="mysql://root:rootpassword@campaign-mysql-test:3306/campaigns" \
    -e PORT=3000 \
    -e HOST=0.0.0.0 \
    -e LOG_LEVEL=error \
    -v $(pwd):/app \
    -w /app \
    campaign-api-test \
    sh -c "
        # Criar arquivo .env.test dentro do container
        echo 'Criando arquivo .env.test dentro do container...'
        cat > .env.test << 'ENVEOF'
NODE_ENV=test
DATABASE_URL=mysql://root:rootpassword@campaign-mysql-test:3306/campaigns
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=error
ENVEOF
        
        # Verificar se o arquivo foi criado
        echo 'Conteúdo do .env.test:'
        cat .env.test
        
        # Verificar variáveis de ambiente
        echo 'Variáveis de ambiente:'
        echo 'NODE_ENV: ' \$NODE_ENV
        echo 'DATABASE_URL: ' \$DATABASE_URL
        
        # Instalar dependências
        echo 'Instalando dependências...'
        npm install
        
        # Gerar cliente Prisma
        echo 'Gerando cliente Prisma...'
        npx prisma generate
        
        # Aguardar um pouco para garantir que a API esteja pronta
        sleep 5
        
        # Executar migrações do banco
        echo 'Executando migrações do banco...'
        npx prisma migrate deploy
        
        # Executar seed se existir
        if [ -f 'prisma/seed.ts' ]; then
            echo 'Executando seed do banco...'
            npx tsx prisma/seed.ts
        fi
        
        # Executar testes
        echo 'Executando suite de testes...'
        npm run test:integration
    "

# Verificar resultado dos testes
if [ $? -eq 0 ]; then
    log_success "Todos os testes passaram com sucesso!"
else
    log_error "Alguns testes falharam!"
    exit 1
fi

log_success "Processo de teste concluído com sucesso!"

# Limpeza será executada automaticamente pelo trap
