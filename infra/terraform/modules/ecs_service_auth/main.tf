# Random suffix for idempotent resource naming
resource "random_id" "service_suffix" {
  byte_length = 4
}

# ECR Repository for Auth Service
resource "aws_ecr_repository" "auth" {
  name                 = "${var.project_name}-${var.environment}/auth"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-auth-ecr"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "auth-task-"
  vpc_id      = var.vpc_id
  description = "Security group for Auth API ECS tasks"

  ingress {
    description     = "HTTP from ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  # Allow incoming connections from other ECS services
  ingress {
    description = "HTTP from ECS services"
    from_port   = var.container_port
    to_port     = var.container_port
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
    Name        = "${var.project_name}-${var.environment}-auth-api-sg"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Target Group
resource "aws_lb_target_group" "auth" {
  name_prefix = "auth-"
  port        = var.container_port
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
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-auth-tg"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ALB Listener Rule for Auth Service (path-based routing)
resource "aws_lb_listener_rule" "auth" {
  listener_arn = var.alb_listener_arn
  priority     = 100 # Higher priority than video service

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.auth.arn
  }

  condition {
    path_pattern {
      values = ["/auth/*", "/users/*"]
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-auth-listener-rule"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "auth" {
  family                   = "auth-${random_id.service_suffix.hex}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name  = "auth-api"
      image = var.container_image

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "PORT"
          value = tostring(var.container_port)
        },
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.database_url
        },
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
          "awslogs-stream-prefix" = "auth"
        }
      }

      essential = true

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.project_name}-${var.environment}-auth-task"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECS Service
resource "aws_ecs_service" "auth" {
  name            = "auth-${random_id.service_suffix.hex}"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.auth.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.auth.arn
    container_name   = "auth-api"
    container_port   = var.container_port
  }

  depends_on = [aws_lb_target_group.auth]

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  tags = {
    Name        = "${var.project_name}-${var.environment}-auth-service"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}
