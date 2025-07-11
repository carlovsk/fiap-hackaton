# ECS Service Auth Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the service will be deployed"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for load balancer"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "cluster_id" {
  description = "ECS cluster ID"
  type        = string
}

variable "execution_role_arn" {
  description = "ECS task execution role ARN"
  type        = string
}

variable "task_role_arn" {
  description = "ECS task role ARN"
  type        = string
}

variable "log_group_name" {
  description = "CloudWatch log group name"
  type        = string
}

variable "service_discovery_namespace_id" {
  description = "Service discovery namespace ID"
  type        = string
}

# Container Configuration
variable "container_image" {
  description = "Docker image for the auth service"
  type        = string
}

variable "cpu" {
  description = "CPU units for the auth service task"
  type        = number
  default     = 512
}

variable "memory" {
  description = "Memory (MB) for the auth service task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of auth service tasks"
  type        = number
  default     = 2
}

variable "container_port" {
  description = "Port on which the auth service container listens"
  type        = number
  default     = 3001
}

# Dependencies
variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "jwt_access_secret_arn" {
  description = "ARN of JWT access secret in AWS Secrets Manager"
  type        = string
}

variable "jwt_refresh_secret_arn" {
  description = "ARN of JWT refresh secret in AWS Secrets Manager"
  type        = string
}

# ALB Integration
variable "alb_arn" {
  description = "ARN of the shared ALB"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID of the shared ALB"
  type        = string
}

variable "alb_listener_arn" {
  description = "ARN of the ALB HTTP listener for routing rules"
  type        = string
}

# Optional SSL certificate
variable "certificate_arn" {
  description = "SSL certificate ARN for HTTPS (optional)"
  type        = string
  default     = ""
}
