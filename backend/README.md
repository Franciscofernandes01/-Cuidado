# 💙 +Cuidado

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/API-Swagger-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tests-Jest%20%2B%20Supertest-red?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-blue?style=for-the-badge" />
</p>

---

# 📌 Sobre o Projeto

O **+Cuidado** é um sistema backend desenvolvido para auxiliar no monitoramento remoto de pacientes, gerenciamento inteligente de medicamentos e comunicação emergencial entre pacientes e familiares/cuidadores.

O projeto foi criado com foco em:

- acessibilidade;
- monitoramento remoto;
- automação de notificações;
- segurança;
- acompanhamento em tempo real;
- integração mobile/backend.

O sistema utiliza **Firebase Authentication**, **Cloud Firestore** e **Firebase Cloud Messaging (FCM)** para fornecer autenticação segura, armazenamento em nuvem e notificações push em tempo real.

---

# 🎯 Objetivo do Projeto

O sistema busca solucionar problemas comuns enfrentados por:

- idosos;
- pacientes em tratamento contínuo;
- familiares;
- cuidadores.

Permitindo:

✅ monitoramento remoto  
✅ gerenciamento de medicamentos  
✅ alertas automáticos  
✅ SOS emergencial  
✅ controle de estoque  
✅ notificações em tempo real  
✅ acompanhamento online/offline  
✅ integração entre paciente e cuidador  

---

# 🧠 Problema Resolvido

Pacientes frequentemente enfrentam dificuldades como:

- esquecer medicamentos;
- perder horários;
- não informar emergências;
- faltar acompanhamento familiar;
- perder controle do estoque de remédios.

O +Cuidado centraliza essas funcionalidades em um único sistema inteligente e automatizado.

---

# 🏗️ Arquitetura do Sistema

## 📡 Arquitetura Geral

```text
┌───────────────────┐
│   Mobile/Web App  │
└─────────┬─────────┘
          │ HTTP REST API
          ▼
┌───────────────────┐
│  Backend Express  │
│     Node.js       │
└─────────┬─────────┘
          │
 ┌────────┼──────────────┐
 │        │              │
 ▼        ▼              ▼
Firebase  Firestore      FCM
Auth      Database       Push Notifications
 │
 ▼
Cron Jobs / Monitoramento
```

---

# ⚙️ Principais Funcionalidades

# 👤 Autenticação

- Login utilizando Firebase Authentication
- Validação JWT
- Middleware de autenticação
- Controle de permissões
- Diferenciação de usuários

Tipos de usuários:

- paciente
- familiar/cuidador

---

# 💊 Gerenciamento de Medicamentos

## Funcionalidades

- cadastro de medicamentos;
- controle de horários;
- frequência personalizada;
- confirmação de medicamento tomado;
- histórico de consumo;
- controle automático de estoque;
- alertas de atraso;
- alertas de estoque baixo.

---

# 🚨 Sistema SOS

O sistema permite envio de SOS emergencial entre paciente e cuidador.

## Fluxo SOS

```text
Paciente → Aciona SOS
        ↓
Backend valida vínculo
        ↓
Evento salvo no Firestore
        ↓
FCM envia push notification
        ↓
Aplicativo dispara alerta
```

---

# 📲 Notificações Push

Integração utilizando Firebase Cloud Messaging (FCM).

## Tipos de notificações

| Tipo | Descrição |
|---|---|
| medicine | Lembrete de medicamentos |
| delayed | Medicamento atrasado |
| stock | Estoque baixo |
| offline | Paciente offline |
| battery | Bateria baixa |
| sos | Emergência |

---

# 🔗 Sistema de Vínculo

O sistema permite vínculo entre:

- paciente ↔ cuidador

## Métodos de vínculo

- QR Code
- UID Firebase
- Token temporário

---

# 🛠️ Tecnologias Utilizadas

| Tecnologia | Função |
|---|---|
| Node.js | Runtime backend |
| Express | API REST |
| Firebase Admin SDK | Integração Firebase |
| Firestore | Banco NoSQL |
| Firebase Authentication | Autenticação |
| Firebase Cloud Messaging | Push Notifications |
| Swagger | Documentação API |
| node-cron | Rotinas automáticas |
| Jest | Testes automatizados |
| Supertest | Testes de API |
| QRCode | Geração de QR Code |

---

# 📂 Estrutura do Projeto

```bash
src/
├── config/
├── jobs/
├── middlewares/
├── routes/
├── services/
├── tests/
├── utils/
```

---

# 🔥 Estrutura Firestore

## 📁 usuarios

```json
{
  "nome": "João",
  "email": "joao@email.com",
  "tipo": "paciente",
  "status": "online",
  "fcmToken": "token"
}
```

---

## 📁 medicamentos

```json
{
  "nome": "Dipirona",
  "dosagem": "500mg",
  "frequencia": 8,
  "estoque": 20,
  "estoqueMinimo": 5,
  "primeiraDoseEm": "2026-05-13T08:00:00"
}
```

---

## 📁 sos

```json
{
  "patientId": "uid",
  "createdAt": "timestamp",
  "status": "ativo"
}
```

---

## 📁 vinculos

```json
{
  "pacienteId": "uid",
  "familiarId": "uid",
  "createdAt": "timestamp"
}
```

---

# 🔐 Segurança

O sistema utiliza Firebase Authentication com validação JWT.

Middleware principal:

```js
admin.auth().verifyIdToken(token)
```

## Recursos de segurança

- autenticação JWT;
- controle de permissões;
- rotas protegidas;
- validação de vínculo;
- autorização baseada em roles;
- separação entre paciente e cuidador.

---

# 👥 Controle de Permissões

## Paciente

Pode:

- enviar SOS;
- gerar QR Code;
- atualizar status;
- receber notificações;
- confirmar medicamento.

---

## Familiar

Pode:

- cadastrar medicamentos;
- monitorar paciente;
- visualizar status;
- receber notificações;
- acompanhar medicamentos;
- receber SOS.

---

# 📜 Regras de Negócio

- ambos podem enviar SOS;
- apenas usuários vinculados podem se comunicar;
- estoque reduz automaticamente ao confirmar medicamento;
- alertas são enviados automaticamente após atraso;
- QR Codes possuem validade temporária;
- familiares só podem acessar dados do paciente vinculado.

---

# ⏰ Monitoramento Automático

O projeto utiliza `node-cron` para automação.

## Rotinas monitoradas

- horários de medicamentos;
- medicamentos atrasados;
- estoque baixo;
- paciente offline;
- bateria baixa.

---

# 🧪 Testes Automatizados

O sistema possui testes utilizando:

- Jest
- Supertest

## Cobertura de testes

✅ autenticação  
✅ permissões  
✅ SOS  
✅ medicamentos  
✅ token inválido  
✅ QR Code  
✅ estoque baixo  
✅ monitoramento cron  
✅ rotas protegidas  

---

# ▶️ Como Executar o Projeto

# 📥 Clonar Projeto

```bash
git clone https://github.com/Franciscofernandes01/-Cuidado.git
```

---

# 📂 Entrar na pasta

```bash
cd -Cuidado/backend
```

---

# 📦 Instalar dependências

```bash
npm install
```

---

# 🔥 Configurar Firebase

O projeto necessita de:

- Firebase Authentication
- Firestore
- Firebase Cloud Messaging

## Passos

1. Criar projeto Firebase
2. Gerar Service Account
3. Baixar credencial JSON
4. Configurar `.env`

---

# 🔐 Configuração .env

```env
PORT=3000

FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_CLIENT_EMAIL=seu-email
FIREBASE_PRIVATE_KEY=sua-chave
```

---

# ▶️ Executar servidor

```bash
npm start
```

Servidor:

```bash
http://localhost:3000
```

---

# 📚 Swagger

A documentação completa da API está disponível em:

```bash
http://localhost:3000/api-docs
```

---

# 📡 Principais Endpoints

# 🔑 Autenticação

```http
POST /auth/google
```

---

# 💊 Medicamentos

## Criar medicamento

```http
POST /medicamentos
```

### Headers

```http
Authorization: Bearer TOKEN
```

### Exemplo Body

```json
{
  "nome": "Dipirona",
  "dosagem": "500mg",
  "frequencia": 8,
  "estoque": 20
}
```

---

## Confirmar medicamento

```http
PATCH /medicamentos/:id/tomar
```

---

# 🚨 SOS

```http
POST /auth/sos
```

## Resposta

```json
{
  "mensagem": "SOS enviado com sucesso"
}
```

---

# 📲 Firebase Cloud Messaging

O sistema envia notificações utilizando:

```js
admin.messaging().send()
```

Exemplo:

```json
{
  "type": "sos",
  "patientName": "João",
  "title": "🚨 SOS",
  "body": "Paciente acionou SOS"
}
```

---


# 🚀 Diferenciais Técnicos

✅ Firebase Authentication  
✅ Firebase Cloud Messaging  
✅ Arquitetura modular  
✅ Controle de permissões  
✅ Monitoramento automatizado  
✅ QR Code de vínculo  
✅ Push notifications em tempo real  
✅ Testes automatizados  
✅ Swagger/OpenAPI  
✅ Middleware JWT  
✅ Sistema de monitoramento remoto  

---

# 🧩 Desafios Técnicos Resolvidos

- sincronização entre paciente e cuidador;
- gerenciamento de notificações em tempo real;
- controle seguro de permissões;
- automação com cron jobs;
- integração Firebase + Express;
- controle de estoque automático;
- monitoramento contínuo.

---

# ☁️ Possível Deploy Futuro

O projeto pode ser hospedado em:

- Render
- Railway
- Firebase Functions
- AWS
- Docker

---

# 📈 Melhorias Futuras

- dashboard web;
- geolocalização em tempo real;
- IA para previsão de atrasos;
- integração com smartwatch;
- relatórios médicos;
- analytics;
- monitoramento avançado.

---

# 🎓 Aprendizados do Projeto

Este projeto permitiu aprofundar conhecimentos em:

- APIs REST;
- Firebase;
- autenticação JWT;
- notificações push;
- arquitetura backend;
- monitoramento em tempo real;
- controle de permissões;
- testes automatizados;
- integração mobile/backend.

---

# 💼 Resumo para Portfólio

> Sistema backend para monitoramento remoto de pacientes e gerenciamento inteligente de medicamentos, desenvolvido com Node.js, Express, Firebase, Firestore, FCM, Swagger e testes automatizados. O projeto possui autenticação segura, notificações push em tempo real, SOS emergencial, controle de estoque e integração entre paciente e cuidador.

---

# 👨‍💻 Autor

## Francisco das Chagas Fernandes de Queiroz Filho

GitHub:

[Franciscofernandes01 GitHub](https://github.com/Franciscofernandes01?utm_source=chatgpt.com)

---

# 📜 Licença

Projeto desenvolvido para fins acadêmicos e educacionais.