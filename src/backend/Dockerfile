ARG DOTNET_SDK_VERSION=10.0-alpine3.22
FROM mcr.microsoft.com/dotnet/sdk:$DOTNET_SDK_VERSION AS build

WORKDIR /src

# Copy solution and project files for restore
COPY *.sln .

# Copy all csproj files (preserving folder structure)
COPY BuildingBlocks/BuildingBlocks.Api/*.csproj BuildingBlocks/BuildingBlocks.Api/
COPY BuildingBlocks/Contracts/*.csproj BuildingBlocks/Contracts/

COPY Services/Assessment/Assessment.Domain/*.csproj Services/Assessment/Assessment.Domain/
COPY Services/Assessment/Assessment.Application/*.csproj Services/Assessment/Assessment.Application/
COPY Services/Assessment/Assessment.Infrastructure/*.csproj Services/Assessment/Assessment.Infrastructure/
COPY Services/Assessment/Assessment.Api/*.csproj Services/Assessment/Assessment.Api/
COPY Services/Assessment/Assessment.Migrator/*.csproj Services/Assessment/Assessment.Migrator/

COPY Services/Media/Media.Domain/*.csproj Services/Media/Media.Domain/
COPY Services/Media/Media.Application/*.csproj Services/Media/Media.Application/
COPY Services/Media/Media.Infrastructure/*.csproj Services/Media/Media.Infrastructure/
COPY Services/Media/Media.Api/*.csproj Services/Media/Media.Api/
COPY Services/Media/Media.Migrator/*.csproj Services/Media/Media.Migrator/

# Restore dependencies
RUN dotnet restore

# Copy all source code
COPY . .

# Build and publish all projects
RUN dotnet publish Services/Assessment/Assessment.Api/Assessment.Api.csproj -c Release -o /src/Services/Assessment/Assessment.Api/bin/Release/net10.0/publish/ --no-restore
RUN dotnet publish Services/Assessment/Assessment.Migrator/Assessment.Migrator.csproj -c Release -o /src/Services/Assessment/Assessment.Migrator/bin/Release/net10.0/publish/ --no-restore
RUN dotnet publish Services/Media/Media.Api/Media.Api.csproj -c Release -o /src/Services/Media/Media.Api/bin/Release/net10.0/publish/ --no-restore
RUN dotnet publish Services/Media/Media.Migrator/Media.Migrator.csproj -c Release -o /src/Services/Media/Media.Migrator/bin/Release/net10.0/publish/ --no-restore

# This image is used as a build artifact container
FROM scratch AS artifacts
COPY --from=build /src /src
