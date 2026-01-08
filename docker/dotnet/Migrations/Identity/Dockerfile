ARG ASPNET_VERSION=10.0-alpine3.22
ARG SOLUTION_IMAGE_NAME

FROM ${SOLUTION_IMAGE_NAME} AS artifacts

FROM mcr.microsoft.com/dotnet/aspnet:${ASPNET_VERSION} AS final
WORKDIR /app

COPY --from=artifacts /app/identity-migrator .

ENTRYPOINT ["dotnet", "Identity.Migrator.dll"]
