# Serviço de Usuários – FIAP Hack SOAT 9

Este serviço é responsável pelo registro, autenticação e controle de acesso de usuários, utilizando autenticação via token Bearer. Faz parte do sistema de processamento de vídeos do FIAP Hack SOAT 9, estruturado em microsserviços e conteinerizado com Docker.

## Funcionalidades

- Registro de usuários com hash seguro de senha (bcrypt)
- Login com emissão de access e refresh tokens (JWT)
- Rota protegida para recuperar dados do usuário autenticado
- Armazenamento e gestão de refresh tokens no PostgreSQL
- Middleware para autenticação de rotas
- Endpoint de verificação de saúde da aplicação

## Endpoints

| Método | Rota               | Descrição                          |
|--------|--------------------|------------------------------------|
| GET    | `/health`          | Verifica se a API está no ar       |
| POST   | `/auth/register`   | Registra um novo usuário           |
| POST   | `/auth/signin`     | Realiza login e emite os tokens    |
| GET    | `/auth/me`         | Retorna dados do usuário logado    |

## Stack

- **Linguagem**: TypeScript (Node.js)
- **Framework**: Express
- **Banco de Dados**: PostgreSQL (com Prisma ORM)
- **Autenticação**: JWT (access + refresh tokens)
- **Containerização**: Docker com Docker Compose

## Variáveis de Ambiente

Definidas no `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/usersdb
JWT_ACCESS_SECRET=chave-secreta-para-access-token
JWT_REFRESH_SECRET=chave-secreta-para-refresh-token
```

## Executando Localmente
```
docker compose up --build
```

A API estará disponível em http://localhost:3000.

Para aplicar as migrações do Prisma (primeira execução):

```
docker compose exec users-api npx prisma migrate dev
```

## Estrutura do Projeto
- src/controllers: Handlers das rotas Express
- src/services: Regras de negócio (AuthService)
- src/middleware: Middleware de autenticação
- src/database: Instância do Prisma
- prisma/schema.prisma: Modelos de dados

## Objetivos

Este serviço foi construído para:
- Garantir segurança e isolamento no fluxo de autenticação
- Fornecer autenticação via token para os demais microsserviços
- Suportar uma arquitetura escalável e modular

## Licença

Uso interno – Hackathon FIAP.