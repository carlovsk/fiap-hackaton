-- Database initialization script for FIAP Hackaton
-- Creates necessary databases for all services

-- Create databases
CREATE DATABASE IF NOT EXISTS usersdb;
CREATE DATABASE IF NOT EXISTS videosdb;

-- Grant permissions (optional, as we're using the default postgres user)
GRANT ALL PRIVILEGES ON DATABASE usersdb TO postgres;
GRANT ALL PRIVILEGES ON DATABASE videosdb TO postgres;

-- Switch to usersdb for any additional setup if needed
\c usersdb;
-- Add any user-specific table setup here if needed

-- Switch to videosdb for any additional setup if needed  
\c videosdb;
-- Add any video-specific table setup here if needed
