# Bootstrap script to create S3 bucket and DynamoDB table for Terraform state
# Run this once before using remote state backend

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "fiap-hackaton"
}

# Random suffix for bucket name uniqueness
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 bucket for Terraform state
# This bucket will store state files for ALL environments:
# - main branch: prod/terraform.tfstate
# - feature branches: {branch-name}/terraform.tfstate
# Each branch gets its own isolated infrastructure
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "${var.project_name}-terraform-state"
    Purpose     = "terraform-state-multi-environment"
    Project     = var.project_name
    ManagedBy   = "terraform"
    Description = "Stores Terraform state for all environments/branches"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
# This table handles locking for ALL environments to prevent:
# - Concurrent modifications
# - State corruption
# - Race conditions between branches/PRs
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "${var.project_name}-terraform-locks-${random_id.bucket_suffix.hex}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-terraform-locks"
    Purpose     = "terraform-state-locking-multi-environment"
    Project     = var.project_name
    ManagedBy   = "terraform"
    Description = "Manages state locking for all environments/branches"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Outputs for backend configuration
output "state_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "backend_config" {
  description = "Backend configuration for main Terraform"
  value = {
    bucket         = aws_s3_bucket.terraform_state.bucket
    key            = "prod/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
    encrypt        = true
  }
}
