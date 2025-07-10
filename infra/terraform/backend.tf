# Configure Terraform for AWS Lab environment
# Using S3 backend for state storage in CI/CD
terraform {
  required_version = ">= 1.0"

  # S3 backend for remote state storage
  # This ensures state persistence across CI/CD runs
  backend "s3" {
    # These values will be set via terraform init -backend-config
    # or environment variables in CI/CD
    # bucket = "fiap-hackaton-terraform-state"
    # key    = "prod/terraform.tfstate"
    # region = "us-east-1"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Course      = "FIAP-9SOAT"
    }
  }
}
