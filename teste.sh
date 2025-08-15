#!/bin/bash

# Script de teste automatizado para a API de campanhas
# Este script constrói e executa testes em um container Docker com MySQL
# Versão melhorada com isolamento completo entre testes

set -e  # Para o script se qualquer comando falhar

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
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

# Função para executar um único arquivo de teste
run_single_test_file() {
    local test_file=$1
    local test_name=$(basename "$test_file" .test.ts)
    
    log_info "========================================="
    log_info "Executando: $test_name"
    log_info "========================================="
    
    # Recriar banco para cada arquivo de teste para garantir isolamento
    log "Resetando banco de dados para teste isolado..."
    docker exec campaign-mysql-test mysql -u root -prootpassword -e "DROP DATABASE IF EXISTS campaigns;"
    docker exec campaign-mysql-test mysql -u root -prootpassword -e "CREATE DATABASE campaigns;"
    
    # Executar o arquivo de teste específico
    docker run --rm \
        --name campaign-api-test-${test_name} \
        --network campaign-test-network \
        -e NODE_ENV=test \
        -e BEARER_AUTH_KEY=1234567890 \
        -e DATABASE_URL="mysql://root:rootpassword@campaign-mysql-test:3306/campaigns" \
        -e PORT=3000 \
        -e HOST=0.0.0.0 \
        -e LOG_LEVEL=error \
        -v $(pwd):/app \
        -w /app \
        campaign-api-test \
        sh -c "
            # Executar migrações do banco
            echo 'Executando migrações do banco...'
            npx prisma migrate deploy
            
            # Executar apenas o arquivo de teste específico
            echo 'Executando teste: $test_file'
            npx vitest run '$test_file' --reporter=verbose --no-coverage
        "
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "✅ $test_name passou com sucesso!"
    else
        log_error "❌ $test_name falhou!"
        return $exit_code
    fi
    
    return 0
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

log "Iniciando processo de teste automatizado com isolamento melhorado..."

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
    --health-interval=5s \
    --health-timeout=3s \
    --health-retries=10 \
    mysql:8.0

# Aguardar MySQL estar saudável
log "Aguardando MySQL estar pronto..."
timeout=120
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

# Preparar dependências no container uma única vez
log "Preparando dependências..."
docker run --rm \
    --name campaign-api-test-setup \
    --network campaign-test-network \
    -v $(pwd):/app \
    -w /app \
    campaign-api-test \
    sh -c "
        # Instalar dependências
        echo 'Instalando dependências...'
        npm install
        
        # Gerar cliente Prisma
        echo 'Gerando cliente Prisma...'
        npx prisma generate
    "

# Descobrir todos os arquivos de teste de integração
log "Descobrindo arquivos de teste..."
test_files=$(find test/integration -name "*.test.ts" | sort)

if [ -z "$test_files" ]; then
    log_error "Nenhum arquivo de teste encontrado!"
    exit 1
fi

log_info "Arquivos de teste encontrados:"
for file in $test_files; do
    log_info "  - $file"
done

# Variáveis para controle de execução
total_tests=0
passed_tests=0
failed_tests=0
failed_test_files=""

# Executar cada arquivo de teste sequencialmente com isolamento completo
for test_file in $test_files; do
    total_tests=$((total_tests + 1))
    
    if run_single_test_file "$test_file"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
        failed_test_files="$failed_test_files\n  - $test_file"
    fi
    
    # Pequena pausa entre testes para garantir limpeza completa
    sleep 2
done

# Relatório final
log_info "========================================="
log_info "RELATÓRIO FINAL DOS TESTES"
log_info "========================================="
log_info "Total de arquivos de teste: $total_tests"
log_success "Testes passaram: $passed_tests"
if [ $failed_tests -gt 0 ]; then
    log_error "Testes falharam: $failed_tests"
    log_error "Arquivos que falharam:$failed_test_files"
else
    log_success "Testes falharam: $failed_tests"
fi

# Verificar resultado geral
if [ $failed_tests -eq 0 ]; then
    log_success "🎉 Todos os testes passaram com sucesso!"
    exit 0
else
    log_error "💥 $failed_tests de $total_tests arquivos de teste falharam!"
    exit 1
fi
