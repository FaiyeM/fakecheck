# Multi-stage build for the FakeCheck API (.NET 10).
# IMPORTANT: build context must be the REPOSITORY ROOT (not backend/), because the API
# copies the prompt library from docs/prompts. On Railway set Root Directory = "." and
# Dockerfile Path = "backend/Dockerfile".
#
#   docker build -f backend/Dockerfile -t fakecheck-api .

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore against project files first for better layer caching.
COPY backend/FakeCheck.sln ./backend/
COPY backend/FakeCheck.Core/FakeCheck.Core.csproj ./backend/FakeCheck.Core/
COPY backend/FakeCheck.Infrastructure/FakeCheck.Infrastructure.csproj ./backend/FakeCheck.Infrastructure/
COPY backend/FakeCheck.Api/FakeCheck.Api.csproj ./backend/FakeCheck.Api/
COPY backend/FakeCheck.Tests/FakeCheck.Tests.csproj ./backend/FakeCheck.Tests/
RUN dotnet restore backend/FakeCheck.Api/FakeCheck.Api.csproj

# Copy the rest of the source + the prompt library.
COPY backend/ ./backend/
COPY docs/ ./docs/
RUN dotnet publish backend/FakeCheck.Api/FakeCheck.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "FakeCheck.Api.dll"]
