# Variables for restricted ECS Video Service
variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "cluster_id" {
  description = "ID of the ECS cluster"
  type        = string
}

variable "execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
}

variable "log_group_name" {
  description = "Name of the CloudWatch log group"
  type        = string
}

variable "service_discovery_namespace_name" {
  description = "Service discovery namespace name"
  type        = string
  default     = ""
}

variable "container_image" {
  description = "Container image for the video API"
  type        = string
}

variable "cpu" {
  description = "CPU units for the task"
  type        = number
  default     = 512
}

variable "memory" {
  description = "Memory for the task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "database_url" {
  description = "Database URL"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "sqs_queue_url" {
  description = "URL of the SQS uploads queue (deprecated - use sqs_uploads_queue_url)"
  type        = string
  default     = ""
}

variable "sqs_uploads_queue_url" {
  description = "URL of the SQS uploads queue"
  type        = string
}

variable "sqs_processed_queue_url" {
  description = "URL of the SQS processed queue"
  type        = string
}

variable "jwt_access_secret_arn" {
  description = "ARN of JWT access secret in Secrets Manager"
  type        = string
}

variable "jwt_refresh_secret_arn" {
  description = "ARN of JWT refresh secret in Secrets Manager"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate"
  type        = string
  default     = ""
}
