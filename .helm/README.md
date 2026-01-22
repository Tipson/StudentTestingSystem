# Helm Chart для StudentTestingSystem

Helm chart для развёртывания полного стека StudentTestingSystem в Kubernetes.

## 📋 Что развёртывается

- **Assessment API** - API для управления тестами и заданиями
- **Media API** - API для работы с медиафайлами и S3
- **Identity API** - API для управления пользователями и группами
- **Grading API** - API для автоматической проверки заданий через AI
- **Frontend** - React приложение с runtime конфигурацией

## 🚀 Быстрый старт

### 1. Подготовка секретов

Сначала создай все необходимые секреты согласно [SECRETS.md](./SECRETS.md):

```bash
# Создай namespace
kubectl create namespace student-testing-system-staging

# Создай секреты (смотри SECRETS.md)
kubectl create secret generic lms-db ...
kubectl create secret generic redis ...
kubectl create secret generic rabbitmq-default-user ...
kubectl create secret generic gemini-secrets ...
kubectl create secret generic lms-s3 ...
```

### 2. Настройка values.yaml

Скопируй `values-example.yaml` в `values.yaml` и измени значения:

```bash
cp values-example.yaml values.yaml
# Отредактируй values.yaml под свою инфраструктуру
```

**Основные параметры для изменения:**
- Домены (`.ingress.host` для каждого сервиса)
- URL Keycloak (`.auth.issuer`)
- URL MinIO (`.s3.serviceUrl`)
- Хосты БД, Redis, RabbitMQ

### 3. Развёртывание через werf

```bash
# Из корня проекта
werf converge --repo registry.lmscloud.ru/student-testing-system
```

## 📁 Структура

```
.helm/
├── templates/           # Kubernetes манифесты
│   ├── assessment-api-*
│   ├── media-api-*
│   ├── identity-api-*
│   ├── grading-api-*
│   └── frontend-*
├── values.yaml          # Конфигурация (не коммитится)
├── values-example.yaml  # Пример конфигурации
├── SECRETS.md          # Документация по секретам
└── README.md           # Этот файл
```

## 🔧 Конфигурация

### Структура values.yaml

Каждый сервис имеет секцию с параметрами:

```yaml
<serviceName>:
  environment: "Staging"      # ASPNETCORE_ENVIRONMENT
  replicaCount: 2             # Количество реплик
  service:
    name: "service-name"      # Имя сервиса
    portHttp: 8080            # Порт
  ingress:
    enabled: true             # Включить Ingress
    host: service.domain.ru   # Домен
  auth:
    issuer: "..."             # Keycloak URL
    clientId: "..."           # Keycloak client
  limits:                     # Resource limits
    memoryRequests: "256Mi"
    memoryLimits: "512Mi"
    cpuRequests: "100m"
    cpuLimits: "500m"
```

### Переменные окружения

Все переменные окружения настраиваются через `values.yaml`:

```yaml
assessmentApi:
  database:
    host: "postgres-postgresql.lms.svc.cluster.local"
  redis:
    host: "redis-master.lms.svc.cluster.local"
  rabbitmq:
    host: "rabbitmq.lms.svc.cluster.local"
  gemini:
    baseUrl: "https://gemini-proxy...."
    model: "gemini-2.5-flash"
```

Секретные данные (пароли, ключи) подтягиваются из Kubernetes Secrets.

## 🔐 Секреты

Проект использует следующие секреты:

| Секрет | Назначение | Ключи |
|--------|-----------|-------|
| `lms-db` | PostgreSQL | `assessmentConnectionString`, `identityConnectionString`, `mediaConnectionString` |
| `redis` | Redis | `redis-password` |
| `rabbitmq-default-user` | RabbitMQ | `username`, `password` |
| `gemini-secrets` | Gemini API | `Gemini__ApiKey` |
| `lms-s3` | MinIO S3 | `accessKey`, `secretKey` |

Подробнее см. [SECRETS.md](./SECRETS.md)

## 🌐 Домены

По умолчанию используется домен `lmscloud.ru`:

- `lmscloud.ru` - Frontend
- `assessment.lmscloud.ru` - Assessment API
- `media.lmscloud.ru` - Media API
- `identity.lmscloud.ru` - Identity API
- `keycloak.lmscloud.ru` - Keycloak
- `s3.lmscloud.ru` - MinIO S3

Для работы требуется wildcard DNS: `*.lmscloud.ru → <IP сервера>`

## 📊 Мониторинг

### Проверка статуса

```bash
# Все поды
kubectl get pods -n student-testing-system-staging

# Все сервисы
kubectl get svc -n student-testing-system-staging

# Все Ingress
kubectl get ingress -n student-testing-system-staging

# Логи конкретного сервиса
kubectl logs -n student-testing-system-staging deployment/assessment-api --tail=50
```

### Health checks

Все API имеют `/healthz` endpoint для проверки здоровья.

## 🔄 Обновление

```bash
# Обновить конфигурацию
vim values.yaml

# Применить изменения
werf converge --repo registry.lmscloud.ru/student-testing-system
```

## 🧹 Удаление

```bash
# Удалить все ресурсы
werf dismiss --env staging

# Или через kubectl
kubectl delete namespace student-testing-system-staging
```

## 🐛 Troubleshooting

### Проблема: Поды не запускаются

```bash
# Проверь события
kubectl describe pod <pod-name> -n student-testing-system-staging

# Проверь логи
kubectl logs <pod-name> -n student-testing-system-staging
```

### Проблема: 404 на Ingress

```bash
# Проверь что Ingress создан
kubectl get ingress -n student-testing-system-staging

# Проверь Ingress Controller
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik
```

### Проблема: База данных недоступна

```bash
# Проверь секрет с connection string
kubectl get secret lms-db -n student-testing-system-staging -o yaml

# Проверь PostgreSQL
kubectl get pods -n lms -l app.kubernetes.io/name=postgresql
```

## 📚 Дополнительно

- [SECRETS.md](./SECRETS.md) - Как создавать секреты
- [values-example.yaml](./values-example.yaml) - Пример конфигурации
