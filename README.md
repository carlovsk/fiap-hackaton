# FIAP's Hackaton

Esse projeto é uma solução completa de microserviços para **upload**, **processamento** e **download** de vídeos, desenvolvida no contexto do Hack SOAT 9 / FIAP X.

Desenvolvido por Carlos Daniel do Nascimento Barboza, RM358356.

---

## Diagrama de Arquitetura

O projeto apresenta duas arquiteturas: local e deployada (AWS). A local utiliza do docker-compose para orquestrar cada serviço juntamente com os serviços necessários para que eles funcionem (como o Minio no lugar do S3, por exemplo). Já a deployada apresenta uma arquitetura completa para subir nossa aplicação de maneira segura e escalável para o ECS Fargate, por meio do Terraform. Abaixo seguem os diagramas e explicações de cada uma delas:

### Arquitetura Deployada

```text
                ┌───────────────────┐
                │     Internet      │
                └───────────────────┘
                          │
                          ▼
                ┌───────────────────┐
                │        ALB        │
                │  (Load Balancer)  │
                └───────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌───────────────────┐             ┌───────────────────┐
│ Serviço de Vídeo  │             │ Serviço de Auth   │
│   (ECS Fargate)   │             │   (ECS Fargate)   │
└───────────────────┘             └───────────────────┘
         │                                 ▲
         │                                 │
         ▼                                 │
┌───────────────────┐                       │
│  SQS (filas:      │◀──────────────────────┘
│  video-uploaded,  │
│  video-processed) │
└───────────────────┘
         │
         ▼
┌───────────────────┐
│ Serviço Worker    │
│   (ECS Fargate)   │
└───────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ RDS (PostgreSQL)                       │
│ S3 (vídeos brutos e processados)       │
│ DynamoDB (usuários)                    │
│ Secrets Manager                        │
└────────────────────────────────────────┘
```

### Arquitetura local

- **Auth**, **Video API**, **Worker** (Node.js/Express)  
- **RabbitMQ** para mensageria  
- **MinIO** para armazenamento de arquivos  
- **PostgreSQL** e **pgAdmin**  
- Rede interna (`app-network`) para comunicação entre containers  

---

## Principais Componentes

- **Auth Service**  
  - Gerencia cadastro, login, logout e refresh de tokens JWT  
  - Banco: PostgreSQL (local) / DynamoDB (AWS)  
  - Endpoints:  
    - `POST /auth/register` - Cadastro de novos usuários  
    - `POST /auth/signin` - Login de usuários  
    - `POST /auth/refresh` - Renovação de tokens  
    - `POST /auth/logout` - Logout de usuários  
    - `GET /auth/me` - Dados do usuário autenticado  
    - `GET /health` - Health check do serviço

- **Video API Service**  
  - Recebe upload de vídeos, lista status e disponibiliza download  
  - Banco: PostgreSQL (local/RDS)  
  - Storage: MinIO (local) / S3 (AWS)  
  - Filas: RabbitMQ (local) / SQS (AWS)  
  - Endpoints:  
    - `POST /videos/upload` - Upload de vídeos (multipart/form-data)  
    - `GET /videos/status` - Lista vídeos do usuário e status de processamento  
    - `GET /videos/:id/download` - Download do ZIP com frames processados  
    - `GET /health` - Health check do serviço

- **Worker Service**  
  - Consome evento de upload, extrai frames (ffmpeg), gera ZIP e reenvia evento  
  - Processamento assíncrono e escalável  
  - Não possui endpoints HTTP (apenas consumidor de filas)  
  - Health check via logs e métricas

---

## Tecnologias Utilizadas

### **Backend & Runtime**
- **Node.js** (v20+) com **TypeScript**  
- **Express.js** para APIs REST  
- **JWT** para autenticação e autorização  
- **Prisma ORM** para modelagem e migrações de banco  

### **Contêineres & Orquestração**
- **Docker** e **Docker Compose** (desenvolvimento local)  
- **ECS Fargate** (AWS) para containers serverless  

### **Infraestrutura como Código**
- **Terraform** para provisionamento AWS  
- **GitHub Actions** para CI/CD  

### **Mensageria & Filas**
- **RabbitMQ** (local) / **Amazon SQS** (AWS)  
- Padrão pub/sub para processamento assíncrono  

### **Armazenamento & Dados**
- **MinIO** (local) / **Amazon S3** (AWS) para arquivos  
- **PostgreSQL** (local/pgAdmin, AWS RDS) para dados relacionais  
- **Amazon DynamoDB** (Auth em AWS)  

### **Observabilidade & Monitoramento**
- **Prometheus** para coleta de métricas (via prom-client)  
- **Grafana** para dashboards e visualização  
- **Structured Logging** com `tslog`  

### **Qualidade & Testes**
- **Vitest** para testes unitários  
- **k6** para testes de performance/carga  
- **ESLint** + **Prettier** para qualidade de código  
- **Husky** para git hooks  

### **Processamento de Mídia**
- **FFmpeg** para extração de frames de vídeo  
- **Archiver** para compressão ZIP  

### **Segurança & Configuração**
- **AWS Secrets Manager** para gerenciamento de segredos  
- **Validação de esquemas** com Zod  
- **CORS** e middlewares de segurança

---

## Fluxo de Desenvolvimento Local

1. **Inicializar containers**  
   ```bash
   docker compose up -d
   ```

2. **Verificar health dos serviços**  
   ```bash
   curl http://localhost:3000/health  # Auth Service
   curl http://localhost:3001/health  # Video API Service
   ```

3. **Executar testes de qualidade**  
   ```bash
   npm run lint              # Verificar padrões de código
   npm run test              # Executar testes unitários
   npm run typecheck         # Verificar tipos TypeScript
   ```

4. **Executar testes de performance (k6)**  
   ```bash
   npm run perf:test         # Todos os cenários
   npm run perf:auth         # Apenas cenários de autenticação
   
   # Ou teste específico
   BASE_URL=http://localhost:3001 VIDEO_PATH=./tests/k6/assets/sample.mp4 k6 run tests/k6/integration.js
   ```

5. **Gerenciar infraestrutura local**  
   ```bash
   npm run docker:up         # Subir todos os serviços
   npm run docker:down       # Parar todos os serviços  
   npm run docker:logs       # Ver logs dos serviços
   npm run docker:status     # Status dos containers
   ```

---

## Fluxo de Deploy (AWS)

### **1. Configuração de CI/CD**
- **GitHub Actions** configurado para build, teste e deploy automatizado  
- **Pipelines separadas** por ambiente (staging/production)  
- **Testes obrigatórios** antes do deploy (unit tests, lint, typecheck)  
- **Proteção de branches** para garantir qualidade  

### **2. Provisionamento de Infraestrutura**  
   ```bash
   # Inicializar estado remoto do Terraform
   npm run infra:setup-state
   
   # Provisionar infraestrutura
   cd infra/terraform
   terraform init
   terraform plan -var-file=staging.tfvars
   terraform apply -var-file=staging.tfvars
   ```

### **3. Build & Deploy Automatizado**  
- **Construção de imagens Docker** otimizadas  
- **Push automático para Amazon ECR**  
- **Versionamento semântico** de releases  
- **Deploy blue-green** via ECS com ALB  

### **4. Monitoramento Pós-Deploy**  
- **Health checks automáticos** pós-deploy  
- **Rollback automático** em caso de falha  
- **Métricas** disponíveis no Grafana

---

## Observações Técnicas

### **Boas Práticas Implementadas**
- ✅ **Clean Architecture** com separação clara de responsabilidades  
- ✅ **Error Handling centralizado** com middleware customizado  
- ✅ **Logging estruturado** com correlação de requests  
- ✅ **Validação rigorosa** de inputs com Zod
- ✅ **Rate Limiting** para proteção contra abuso  
- ✅ **Timeout configurável** para operações críticas  

### **Segurança**
- 🔐 **JWT** com refresh tokens para autenticação  
- 🔐 **CORS** configurado adequadamente  
- 🔐 **Hashing seguro** de senhas com bcrypt  

### **Performance**
- ⚡ **Connection pooling** do Prisma otimizado  
- ⚡ **Caching** em múltiplas camadas (Redis, CDN)  
- ⚡ **Processamento assíncrono** via queues  

### **Observabilidade**
- 📊 **Health checks** detalhados para cada serviço  
- 📊 **Métricas** customizadas via Prometheus  
- 📊 **Dashboards** no Grafana com alertas configurados  

### **Escalabilidade**
- 🚀 **Horizontal scaling** via containers  
- 🚀 **Load balancing** com ALB (AWS)  
- 🚀 **Auto-scaling** baseado em métricas  

---

## Considerações Finais

Este projeto demonstra:

- **Microserviços desacoplados** e escaláveis  
- **Arquitetura orientada a eventos**  
- **Infraestrutura como código** garantindo reprodutibilidade  
- **Padrões de qualidade**: testes unitários, lint, CI/CD, monitoramento  
- **Duas arquiteturas**: local (Docker Compose) e nuvem (AWS)

Para mais detalhes sobre cada serviço, consulte os READMEs em `apps/auth/README.md`, `apps/video/README.md` e `apps/worker/README.md`.
