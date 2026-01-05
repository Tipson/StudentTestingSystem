ARG SOLUTION_IMAGE_NAME=ghcr.io/your-org/lms/solution-build-artifacts:1.0.0
ARG ASPNET_VERSION=10.0-alpine3.22
FROM $SOLUTION_IMAGE_NAME AS builder

ARG ASPNET_VERSION
FROM mcr.microsoft.com/dotnet/aspnet:$ASPNET_VERSION

WORKDIR /app

COPY --from=builder /src/Services/Media/Media.Migrator/bin/Release/net10.0/publish/ .

ENTRYPOINT ["dotnet", "Media.Migrator.dll"]
