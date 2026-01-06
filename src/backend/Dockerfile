ARG DOTNET_SDK_VERSION=10.0-alpine3.22
FROM mcr.microsoft.com/dotnet/sdk:$DOTNET_SDK_VERSION AS restore

WORKDIR /src
ENV NUGET_PACKAGES=/root/.nuget/packages

# Только sln + csproj для кешируемого restore-слоя
COPY *.sln .

# BuildingBlocks
COPY BuildingBlocks/Api/*.csproj BuildingBlocks/Api/
COPY BuildingBlocks/Shared/Contracts/*.csproj BuildingBlocks/Shared/Contracts/

# Identity
COPY Services/Identity/Identity.Domain/*.csproj Services/Identity/Identity.Domain/
COPY Services/Identity/Identity.Application/*.csproj Services/Identity/Identity.Application/
COPY Services/Identity/Identity.Infrastructure/*.csproj Services/Identity/Identity.Infrastructure/
COPY Services/Identity/Identity.Api/*.csproj Services/Identity/Identity.Api/
COPY Services/Identity/Identity.Migrator/*.csproj Services/Identity/Identity.Migrator/

# Assessment
COPY Services/Assessment/Assessment.Domain/*.csproj Services/Assessment/Assessment.Domain/
COPY Services/Assessment/Assessment.Application/*.csproj Services/Assessment/Assessment.Application/
COPY Services/Assessment/Assessment.Infrastructure/*.csproj Services/Assessment/Assessment.Infrastructure/
COPY Services/Assessment/Assessment.Api/*.csproj Services/Assessment/Assessment.Api/
COPY Services/Assessment/Assessment.Migrator/*.csproj Services/Assessment/Assessment.Migrator/

# Media
COPY Services/Media/Media.Domain/*.csproj Services/Media/Media.Domain/
COPY Services/Media/Media.Application/*.csproj Services/Media/Media.Application/
COPY Services/Media/Media.Infrastructure/*.csproj Services/Media/Media.Infrastructure/
COPY Services/Media/Media.Api/*.csproj Services/Media/Media.Api/
COPY Services/Media/Media.Migrator/*.csproj Services/Media/Media.Migrator/

# Generation
COPY Services/Generation/Generation.Worker/*.csproj Services/Generation/Generation.Worker/

# Notifications
COPY Services/Notifications/Notifications.Worker/*.csproj Services/Notifications/Notifications.Worker/

# Proctoring
COPY Services/Proctoring/Proctoring.Api/*.csproj Services/Proctoring/Proctoring.Api/
COPY Services/Proctoring/Proctoring.Application/*.csproj Services/Proctoring/Proctoring.Application/
COPY Services/Proctoring/Proctoring.Domain/*.csproj Services/Proctoring/Proctoring.Domain/
COPY Services/Proctoring/Proctoring.Infrastructure/*.csproj Services/Proctoring/Proctoring.Infrastructure/

# Общий restore (кешируется)
RUN dotnet restore StudentTestingSystem.sln --disable-parallel

# ==========================================================
# Publish stage (после того как исходники уже доступны)
# ==========================================================
FROM restore AS publish

COPY BuildingBlocks/ BuildingBlocks/
COPY Services/ Services/

# Точечный restore для publish-проектов (иначе словишь NETSDK1064 на analyzers)
RUN dotnet restore Services/Identity/Identity.Api/Identity.Api.csproj --disable-parallel
RUN dotnet restore Services/Identity/Identity.Migrator/Identity.Migrator.csproj --disable-parallel
RUN dotnet restore Services/Assessment/Assessment.Api/Assessment.Api.csproj --disable-parallel
RUN dotnet restore Services/Assessment/Assessment.Migrator/Assessment.Migrator.csproj --disable-parallel
RUN dotnet restore Services/Media/Media.Api/Media.Api.csproj --disable-parallel
RUN dotnet restore Services/Media/Media.Migrator/Media.Migrator.csproj --disable-parallel

# publish
RUN dotnet publish Services/Identity/Identity.Api/Identity.Api.csproj -c Release -o /app/identity-api --no-restore -p:PublishTrimmed=false
RUN dotnet publish Services/Identity/Identity.Migrator/Identity.Migrator.csproj -c Release -o /app/identity-migrator --no-restore -p:PublishTrimmed=false

RUN dotnet publish Services/Assessment/Assessment.Api/Assessment.Api.csproj -c Release -o /app/assessment-api --no-restore -p:PublishTrimmed=false
RUN dotnet publish Services/Assessment/Assessment.Migrator/Assessment.Migrator.csproj -c Release -o /app/assessment-migrator --no-restore -p:PublishTrimmed=false

RUN dotnet publish Services/Media/Media.Api/Media.Api.csproj -c Release -o /app/media-api --no-restore -p:PublishTrimmed=false
RUN dotnet publish Services/Media/Media.Migrator/Media.Migrator.csproj -c Release -o /app/media-migrator --no-restore -p:PublishTrimmed=false

# ==========================================================
# Final artifacts image (runnable to avoid "no command specified")
# ==========================================================
FROM alpine:3.22 AS artifacts
WORKDIR /app
COPY --from=publish /app /app
CMD ["sh", "-c", "sleep infinity"]
