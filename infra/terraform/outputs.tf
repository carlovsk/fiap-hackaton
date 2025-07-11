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

# ECS Service Outputs
output "ecs_video_service_name" {
  description = "Name of the Video API ECS service"
  value       = module.ecs_service_video.service_name
}

output "ecs_worker_service_name" {
  description = "Name of the Worker ECS service"
  value       = module.ecs_service_worker.service_name
}

output "ecs_video_task_definition_arn" {
  description = "ARN of the Video API task definition"
  value       = module.ecs_service_video.task_definition_arn
}

output "ecs_worker_task_definition_arn" {
  description = "ARN of the Worker task definition"
  value       = module.ecs_service_worker.task_definition_arn
}

# ECR Repository URIs
output "ecr_video_repository_url" {
  description = "ECR repository URL for video service"
  value       = "https://${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/fiap-hackaton-${var.environment}/video"
}

output "ecr_worker_repository_url" {
  description = "ECR repository URL for worker service"
  value       = "https://${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/fiap-hackaton-${var.environment}/worker"
}

output "ecr_base_uri" {
  description = "Base ECR URI for repositories"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/fiap-hackaton-${var.environment}"
}

# Secrets Manager Output
output "secrets_arns" {
  description = "ARNs of the secrets in AWS Secrets Manager"
  value       = module.secrets_manager.secret_arns
  sensitive   = true
}
