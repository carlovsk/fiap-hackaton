# Random suffix for idempotent resource naming
resource "random_id" "cluster_suffix" {
  byte_length = 4
}

# Simplified ECS Cluster Configuration for AWS Lab Environment
# This version uses existing AWS managed roles and policies

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-${random_id.cluster_suffix.hex}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}-${var.environment}-${random_id.cluster_suffix.hex}"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Note: In this restricted version, we assume the following roles exist or will be provided:
# - Task Execution Role: You'll need to provide an existing role ARN
# - Task Role: You'll need to provide an existing role ARN
# These should be passed as variables from the root module
