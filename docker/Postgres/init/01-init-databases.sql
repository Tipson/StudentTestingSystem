-- Create databases for each service
CREATE DATABASE assessment;
CREATE DATABASE media;
CREATE DATABASE keycloak;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE assessment TO postgres;
GRANT ALL PRIVILEGES ON DATABASE media TO postgres;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO postgres;
