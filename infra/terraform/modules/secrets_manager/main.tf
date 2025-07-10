# Random suffix for idempotent resource naming
resource "random_id" "secrets_suffix" {
  byte_length = 4
}

# JWT Access Secret
resource "aws_secretsmanager_secret" "jwt_access_secret" {
  name                    = "${var.project_name}-${var.environment}-jwt-access-secret-${random_id.secrets_suffix.hex}"
  description             = "JWT access token secret for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-jwt-access-secret"
    Environment = var.environment
    Project     = var.project_name
    Type        = "jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_access_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_access_secret.id
  secret_string = var.jwt_access_secret
}

# JWT Refresh Secret
resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name                    = "${var.project_name}-${var.environment}-jwt-refresh-secret-${random_id.secrets_suffix.hex}"
  description             = "JWT refresh token secret for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-jwt-refresh-secret"
    Environment = var.environment
    Project     = var.project_name
    Type        = "jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_refresh_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh_secret.id
  secret_string = var.jwt_refresh_secret
}

# Database URL Secret
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project_name}-${var.environment}-database-url-${random_id.secrets_suffix.hex}"
  description             = "Database connection URL for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-database-url"
    Environment = var.environment
    Project     = var.project_name
    Type        = "database-secret"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = var.database_url
}

# Application Environment Variables Secret (for other non-sensitive config)
resource "aws_secretsmanager_secret" "app_config" {
  name                    = "${var.project_name}-${var.environment}-app-config-${random_id.secrets_suffix.hex}"
  description             = "Application configuration for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-app-config"
    Environment = var.environment
    Project     = var.project_name
    Type        = "app-config"
  }
}

# Default app config (can be overridden)
resource "aws_secretsmanager_secret_version" "app_config" {
  secret_id = aws_secretsmanager_secret.app_config.id
  secret_string = jsonencode({
    NODE_ENV = var.environment
    PORT     = "3000"
  })
}
