# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "fiap-hackaton"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

# ECS Configuration
variable "video_api_cpu" {
  description = "CPU units for Video API ECS task"
  type        = number
  default     = 512
}

variable "video_api_memory" {
  description = "Memory (MB) for Video API ECS task"
  type        = number
  default     = 1024
}

variable "worker_cpu" {
  description = "CPU units for Worker ECS task"
  type        = number
  default     = 1024
}

variable "worker_memory" {
  description = "Memory (MB) for Worker ECS task"
  type        = number
  default     = 2048
}

variable "video_api_desired_count" {
  description = "Desired number of Video API tasks"
  type        = number
  default     = 2
}

variable "worker_desired_count" {
  description = "Desired number of Worker tasks"
  type        = number
  default     = 1
}

# Container Configuration
variable "video_api_image" {
  description = "Docker image for Video API"
  type        = string
  default     = "your-account-id.dkr.ecr.us-east-1.amazonaws.com/fiap-hackaton-main/video:latest"
}

variable "worker_image" {
  description = "Docker image for Worker"
  type        = string
  default     = "your-account-id.dkr.ecr.us-east-1.amazonaws.com/fiap-hackaton-main/worker:latest"
}

# Security Configuration
variable "jwt_access_secret" {
  description = "JWT access token secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
}

# Domain Configuration (optional)
variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "SSL certificate ARN for HTTPS (optional)"
  type        = string
  default     = ""
}
