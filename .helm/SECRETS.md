# Секреты для развёртывания

Перед развёртыванием создай эти секреты в namespace `student-testing-system-staging`.

## Обязательные секреты

### 1. PostgreSQL (`lms-db`)
```bash
kubectl create secret generic lms-db -n student-testing-system-staging \
  --from-literal=assessmentConnectionString="Host=postgres-postgresql.lms.svc.cluster.local;Port=5432;Database=assessment;Username=postgres;Password=YOUR_PASSWORD" \
  --from-literal=identityConnectionString="Host=postgres-postgresql.lms.svc.cluster.local;Port=5432;Database=identity;Username=postgres;Password=YOUR_PASSWORD" \
  --from-literal=mediaConnectionString="Host=postgres-postgresql.lms.svc.cluster.local;Port=5432;Database=media;Username=postgres;Password=YOUR_PASSWORD"
```

### 2. Redis (`redis`)
```bash
kubectl create secret generic redis -n student-testing-system-staging \
  --from-literal=redis-password="YOUR_REDIS_PASSWORD"
```

### 3. RabbitMQ (`rabbitmq-default-user`)
```bash
kubectl create secret generic rabbitmq-default-user -n student-testing-system-staging \
  --from-literal=username="admin" \
  --from-literal=password="YOUR_RABBITMQ_PASSWORD"
```

### 4. Gemini API (`gemini-secrets`)
```bash
kubectl create secret generic gemini-secrets -n student-testing-system-staging \
  --from-literal=Gemini__ApiKey="YOUR_GEMINI_API_KEY"
```
Получить ключ: https://aistudio.google.com/app/apikey

### 5. MinIO (`lms-s3`)
```bash
kubectl create secret generic lms-s3 -n student-testing-system-staging \
  --from-literal=accessKey="YOUR_MINIO_ACCESS_KEY" \
  --from-literal=secretKey="YOUR_MINIO_SECRET_KEY"
```

## Проверка
```bash
kubectl get secrets -n student-testing-system-staging
```

## Развёртывание
После создания секретов:
```bash
werf converge --repo registry.lmscloud.ru/student-testing-system
```

## Безопасность
- ⚠️ Не коммить секреты в Git
- Используй сложные пароли (32+ символа)
- Периодически ротируй пароли
