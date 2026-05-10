# 💙 +Cuidado

![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)
![Swagger](https://img.shields.io/badge/API-Swagger-brightgreen)
![Tests](https://img.shields.io/badge/Tests-Jest%20%2B%20Supertest-red)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)

Sistema backend desenvolvido para auxiliar no monitoramento de pacientes, gerenciamento de medicamentos e comunicação emergencial entre pacientes e familiares/cuidadores.

O projeto foi desenvolvido com foco em acessibilidade, monitoramento remoto e automação de notificações utilizando Firebase Cloud Messaging (FCM).

---

# 📌 Objetivo do Projeto

O objetivo do sistema é oferecer uma solução que permita:

* monitoramento remoto do paciente;
* gerenciamento inteligente de medicamentos;
* envio automático de notificações;
* alertas de SOS em tempo real;
* acompanhamento de status online/offline;
* controle de estoque de medicamentos;
* integração entre paciente e familiar.

O sistema foi pensado principalmente para idosos, pessoas em tratamento contínuo e cuidadores.

---

# 🚀 Funcionalidades Principais

## 👤 Autenticação

* Login com Google Firebase Authentication
* Controle de permissões
* Middleware de autenticação
* Diferenciação entre:

  * paciente
  * familiar/cuidador

---

## 💊 Medicamentos

* Cadastro de medicamentos
* Controle de frequência
* Controle de horários
* Histórico de consumo
* Confirmação de medicamento tomado
* Controle automático de estoque
* Alertas de atraso
* Alertas de estoque baixo

---

## 🚨 SOS

* Envio de SOS entre paciente e cuidador
* Registro de eventos
* Notificações push em tempo real
* Integração com alarmes do aplicativo mobile

---

## 📲 Notificações Push

Integração com Firebase Cloud Messaging:

* lembrete de medicamento;
* medicamento atrasado;
* estoque baixo;
* bateria baixa;
* paciente offline;
* SOS emergencial.

---

## 🔗 Vínculo entre Usuários

O sistema permite vincular:

* paciente ↔ cuidador

Utilizando:

* QR Code
* Token temporário
* UID do Firebase

---

# 🛠 Tecnologias Utilizadas

| Tecnologia               | Função               |
| ------------------------ | -------------------- |
| Node.js                  | Runtime backend      |
| Express                  | API REST             |
| Firebase Admin SDK       | Integração Firebase  |
| Firestore                | Banco NoSQL          |
| Firebase Authentication  | Autenticação         |
| Firebase Cloud Messaging | Push notifications   |
| Swagger                  | Documentação da API  |
| node-cron                | Rotinas automáticas  |
| Jest                     | Testes automatizados |
| Supertest                | Testes de API        |
| QRCode                   | Geração de QR Code   |

---

# 🧱 Arquitetura Backend

O backend foi estruturado utilizando:

* rotas separadas;
* middlewares;
* serviços;
* jobs automatizados;
* integração Firebase.

Estrutura principal:

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

# ⚙️ Configuração do Ambiente

## 📥 Clonar Projeto

```bash
git clone https://github.com/Franciscofernandes01/-Cuidado.git
```

```bash
cd -Cuidado/backend
```

---

# 📦 Instalação

```bash
npm install
```

---

# 🔥 Configuração Firebase

O projeto utiliza:

* Firebase Authentication
* Firestore Database
* Firebase Cloud Messaging

É necessário:

1. Criar um projeto Firebase
2. Gerar a Service Account
3. Inserir o JSON da credencial
4. Configurar o `.env`

---

# 🔐 Configuração .env

Exemplo:

```env
PORT=3000

FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_CLIENT_EMAIL=seu-email
FIREBASE_PRIVATE_KEY=sua-chave
```

---

# ▶️ Executar Projeto

## Desenvolvimento

```bash
npm start
```

Servidor:

```bash
http://localhost:3000
```

---

# 🧪 Testes Automatizados

O projeto possui testes automatizados utilizando:

* Jest
* Supertest

### Executar testes

```bash
npm test
```

---

## Testes Implementados

* autenticação;
* permissões;
* SOS;
* medicamentos;
* token inválido;
* vínculo QR Code;
* estoque baixo;
* rotas protegidas;
* monitoramento cron.

Os testes utilizam mocks para evitar alterações no Firebase real.

---

# 📚 Swagger

A documentação da API está disponível em:

```bash
http://localhost:3000/api-docs
```

O Swagger documenta:

* autenticação;
* medicamentos;
* SOS;
* vínculos;
* status;
* notificações.

---

# 🔒 Segurança e Autenticação

A autenticação é feita via Firebase Authentication.

Middleware principal:

```js
admin.auth().verifyIdToken(token)
```

O sistema protege:

* rotas privadas;
* permissões por tipo de usuário;
* validação de token;
* acesso entre paciente e familiar.

---

# 👥 Controle de Permissões

## Paciente

Pode:

* cadastrar medicamentos;
* enviar SOS;
* gerar QR Code;
* atualizar status.

## Familiar

Pode:

* receber SOS;
* monitorar paciente;
* visualizar status;
* receber notificações.

---

# 🚨 Fluxo SOS

1. Usuário aciona SOS
2. Backend valida vínculo
3. Evento é salvo no Firestore
4. FCM envia Data Message
5. Aplicativo dispara alarme

Exemplo de payload:

```json
{
  "type": "sos",
  "patientName": "João",
  "title": "🚨 SOS",
  "body": "Paciente acionou SOS"
}
```

---

# 💊 Fluxo de Medicamentos

1. Medicamento cadastrado
2. Cron monitora horários
3. Sistema envia lembrete
4. Após atraso → alerta automático
5. Usuário confirma medicamento
6. Estoque é atualizado

---

# ⏰ Monitoramento Automático

O projeto utiliza `node-cron`.

Funções monitoradas:

* horários de medicamentos;
* atrasos;
* estoque baixo;
* paciente offline;
* bateria baixa.

---

# 📡 Firebase Cloud Messaging

O sistema envia notificações utilizando:

```js
admin.messaging().send()
```

Tipos de notificações:

| Tipo     | Descrição        |
| -------- | ---------------- |
| sos      | Emergência       |
| medicine | Medicamentos     |
| offline  | Paciente offline |
| bateria  | Bateria baixa    |

---

# 📌 Exemplos de Rotas

## Login Google

```http
POST /auth/google
```

---

## SOS

```http
POST /auth/sos
```

---

## Criar Medicamento

```http
POST /medicamentos
```

---

## Confirmar Medicamento

```http
PATCH /medicamentos/:id/tomar
```

---

# 📄 Exemplo JSON

## Resposta SOS

```json
{
  "mensagem": "SOS enviado com sucesso"
}
```

---

## Resposta Medicamento

```json
{
  "mensagem": "Medicamento tomado com sucesso"
}
```

---

# 📈 Melhorias Futuras

* dashboard web;
* geolocalização em tempo real;
* IA para previsão de atrasos;
* relatórios médicos;
* integração com smartwatch;
* deploy em nuvem;
* monitoramento avançado.

---

# ☁️ Possível Deploy Futuro

O projeto pode ser hospedado utilizando:

* Render
* Railway
* Firebase Functions
* AWS
* Docker

---

# 🎓 Pontos Fortes para Apresentação Acadêmica

* integração Firebase;
* autenticação segura;
* notificações push;
* cron jobs;
* testes automatizados;
* documentação Swagger;
* arquitetura modular;
* controle de permissões;
* integração mobile/backend.

---

# 💼 Versão Resumida para Portfólio

> Sistema backend para monitoramento de pacientes e gerenciamento inteligente de medicamentos, desenvolvido com Node.js, Firebase, FCM, Swagger e testes automatizados. O projeto possui autenticação segura, alertas em tempo real, controle de medicamentos, SOS emergencial e integração entre paciente e cuidador.

---

# 👨‍💻 Autor

Francisco das Chagas Fernandes de Queiroz Filho

GitHub:
https://github.com/Franciscofernandes01

---

# 📜 Licença

Projeto desenvolvido para fins acadêmicos e educacionais.
