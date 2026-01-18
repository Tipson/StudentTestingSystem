ARG ASPNET_VERSION=10.0-alpine3.22
ARG SOLUTION_IMAGE_NAME

FROM ${SOLUTION_IMAGE_NAME} AS artifacts

FROM mcr.microsoft.com/dotnet/aspnet:${ASPNET_VERSION} AS final
WORKDIR /app

COPY --from=artifacts /app/grading-api .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Grading.Api.dll"]