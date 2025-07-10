# Network Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.network.private_subnet_ids
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "database_url" {
  description = "Complete database connection URL"
  value       = module.rds.database_url
  sensitive   = true
}

# Storage Outputs
output "videos_bucket_name" {
  description = "Name of the videos S3 bucket"
  value       = module.s3.videos_bucket_name
}

# Legacy outputs for backward compatibility
output "uploads_bucket_name" {
  description = "Name of the uploads S3 bucket (same as videos bucket)"
  value       = module.s3.uploads_bucket_name
}

output "processed_bucket_name" {
  description = "Name of the processed videos S3 bucket (same as videos bucket)"
  value       = module.s3.processed_bucket_name
}

# Queue Outputs
output "uploads_queue_url" {
  description = "URL of the uploads SQS queue"
  value       = module.sqs.uploads_queue_url
}

output "processed_queue_url" {
  description = "URL of the processed SQS queue"
  value       = module.sqs.processed_queue_url
}

# Load Balancer Output
output "video_api_url" {
  description = "URL of the Video API load balancer"
  value       = module.ecs_service_video.alb_dns_name
}

# ECS Cluster Output
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs_cluster.cluster_name
}

# Secrets Manager Output
output "secrets_arns" {
  description = "ARNs of the secrets in AWS Secrets Manager"
  value       = module.secrets_manager.secret_arns
  sensitive   = true
}
