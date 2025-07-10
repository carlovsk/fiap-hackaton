# Secrets Manager Module Outputs

output "jwt_access_secret_arn" {
  description = "ARN of the JWT access secret"
  value       = aws_secretsmanager_secret.jwt_access_secret.arn
}

output "jwt_refresh_secret_arn" {
  description = "ARN of the JWT refresh secret"
  value       = aws_secretsmanager_secret.jwt_refresh_secret.arn
}

output "database_url_secret_arn" {
  description = "ARN of the database URL secret"
  value       = aws_secretsmanager_secret.database_url.arn
}

output "app_config_secret_arn" {
  description = "ARN of the app config secret"
  value       = aws_secretsmanager_secret.app_config.arn
}

output "secret_arns" {
  description = "Map of all secret ARNs"
  value = {
    jwt_access_secret  = aws_secretsmanager_secret.jwt_access_secret.arn
    jwt_refresh_secret = aws_secretsmanager_secret.jwt_refresh_secret.arn
    database_url       = aws_secretsmanager_secret.database_url.arn
    app_config         = aws_secretsmanager_secret.app_config.arn
  }
}
