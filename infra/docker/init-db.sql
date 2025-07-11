-- Database initialization script for FIAP Hackaton
-- Creates necessary databases for all services

-- The usersdb database is automatically created by POSTGRES_DB
-- Create videosdb database for video and worker services

SELECT 'CREATE DATABASE videosdb OWNER postgres'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'videosdb')\gexec

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE usersdb TO postgres;
GRANT ALL PRIVILEGES ON DATABASE videosdb TO postgres;

-- Ensure databases are ready
\c usersdb;
SELECT version();

\c videosdb;
SELECT version();
