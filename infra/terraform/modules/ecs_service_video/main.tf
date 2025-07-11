# Random suffix for idempotent resource naming
resource "random_id" "service_suffix" {
  byte_length = 4
}

# Simplified ECS Service Configuration for Video API (AWS Lab Environment)
# This version avoids creating custom IAM policies

# Security Group for ALB
resource "aws_security_group" "alb" {
  name_prefix = "vid-alb-"
  vpc_id      = var.vpc_id
  description = "Security group for Video API ALB"

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-video-alb-sg"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "vid-task-"
  vpc_id      = var.vpc_id
  description = "Security group for Video API ECS tasks"

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow incoming connections from other ECS services
  ingress {
    description = "HTTP from ECS services"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    self        = true
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-video-api-sg"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name_prefix        = "vid-"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false # Disabled for lab environments

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Target Group
resource "aws_lb_target_group" "video_api" {
  name_prefix = "vid-"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-video-api-tg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ALB Listener (HTTP only for simplicity)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  # Default action returns 404 for unmatched paths
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Service not found"
      status_code  = "404"
    }
  }
}

# ALB Listener Rule for Video API
resource "aws_lb_listener_rule" "video_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 200 # Lower priority than auth service

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.video_api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/videos/*", "/metrics"]
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-video-listener-rule"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECS Task Definition (simplified - uses provided role ARNs)
resource "aws_ecs_task_definition" "video_api" {
  family                   = "vid-api-${random_id.service_suffix.hex}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name  = "video-api"
      image = var.container_image

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

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
          name  = "METRICS_PORT"
          value = "8080"
        },
        {
          name  = "DATABASE_URL"
          value = var.database_url
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
          "awslogs-stream-prefix" = "video-api"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${var.project_name}-${var.environment}-video-api"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECS Service
resource "aws_ecs_service" "video_api" {
  name            = "vid-api-${random_id.service_suffix.hex}"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.video_api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.video_api.arn
    container_name   = "video-api"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name        = "${var.project_name}-${var.environment}-video-api-service"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Note: This restricted version assumes you provide:
# - execution_role_arn: ARN of existing ECS execution role (e.g., LabRole)
# - task_role_arn: ARN of existing ECS task role (e.g., LabRole)
# 
# The LabRole in AWS Academy typically has broad permissions for learning purposes.
