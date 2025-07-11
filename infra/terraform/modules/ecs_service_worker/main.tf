# Random suffix for idempotent resource naming
resource "random_id" "worker_suffix" {
  byte_length = 4
}

# Simplified ECS Worker Service Configuration (AWS Lab Environment)
# This version avoids creating custom IAM policies

# Security Group for ECS Worker Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "wrk-"
  vpc_id      = var.vpc_id
  description = "Security group for Worker ECS tasks"

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow outgoing connections to other ECS services
  egress {
    description = "HTTP to ECS services"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-worker-sg"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ECS Task Definition (simplified - uses provided role ARNs)
resource "aws_ecs_task_definition" "worker" {
  family                   = "wrk-${random_id.worker_suffix.hex}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name  = "worker"
      image = var.container_image

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "STORAGE_ADAPTER"
          value = "s3"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "MESSAGING_ADAPTER"
          value = "sqs"
        },
        {
          name  = "SQS_UPLOADS_QUEUE_URL"
          value = var.sqs_uploads_queue_url
        },
        {
          name  = "SQS_PROCESSED_QUEUE_URL"
          value = var.sqs_processed_queue_url
        },
        {
          name  = "JWT_ACCESS_EXPIRES_IN"
          value = "15m"
        },
        {
          name  = "JWT_REFRESH_EXPIRES_IN"
          value = "7d"
        },
        {
          name  = "AUTH_SERVICE_URL"
          value = "http://auth.${var.service_discovery_namespace_name}:3001"
        }
      ]

      secrets = [
        {
          name      = "JWT_ACCESS_SECRET"
          valueFrom = var.jwt_access_secret_arn
        },
        {
          name      = "JWT_REFRESH_SECRET"
          valueFrom = var.jwt_refresh_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${var.project_name}-${var.environment}-worker"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECS Service
resource "aws_ecs_service" "worker" {
  name            = "wrk-${random_id.worker_suffix.hex}"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-worker-service"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Note: This restricted version assumes you provide:
# - execution_role_arn: ARN of existing ECS execution role (e.g., LabRole)
# - task_role_arn: ARN of existing ECS task role (e.g., LabRole)
# 
# The LabRole in AWS Academy typically has broad permissions for learning purposes.
