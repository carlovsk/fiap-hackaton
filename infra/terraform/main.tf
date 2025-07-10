# Root Terraform Configuration
# This file orchestrates all the infrastructure modules

# Data sources for current AWS info
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values for common configurations
locals {
  # In AWS Academy/Lab environments, use the LabRole which has broad permissions
  lab_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
}

# Network Module - VPC, subnets, gateways, routing
module "network" {
  source = "./modules/network"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# RDS Module - PostgreSQL database
module "rds" {
  source = "./modules/rds"

  project_name             = var.project_name
  environment              = var.environment
  vpc_id                   = module.network.vpc_id
  private_subnet_ids       = module.network.private_subnet_ids
  vpc_cidr_block           = module.network.vpc_cidr_block
  db_instance_class        = var.db_instance_class
  db_allocated_storage     = var.db_allocated_storage
  db_max_allocated_storage = var.db_max_allocated_storage
}

# S3 Module - Storage buckets for uploads and processed videos
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# SQS Module - Message queues for asynchronous processing
module "sqs" {
  source = "./modules/sqs"

  project_name = var.project_name
  environment  = var.environment
}

# Secrets Manager Module - Secure storage for secrets
module "secrets_manager" {
  source = "./modules/secrets_manager"

  project_name       = var.project_name
  environment        = var.environment
  jwt_access_secret  = var.jwt_access_secret
  jwt_refresh_secret = var.jwt_refresh_secret
  database_url       = module.rds.database_url
}

# ECS Cluster Module - Fargate cluster and base resources
module "ecs_cluster" {
  source = "./modules/ecs_cluster"

  project_name = var.project_name
  environment  = var.environment
}

# ECS Video API Service - Web API with load balancer
module "ecs_service_video" {
  source = "./modules/ecs_service_video"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = data.aws_region.current.name
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  cluster_id         = module.ecs_cluster.cluster_id
  execution_role_arn = local.lab_role_arn
  task_role_arn      = local.lab_role_arn
  log_group_name     = module.ecs_cluster.log_group_name

  # Container configuration
  container_image = var.video_api_image
  cpu             = var.video_api_cpu
  memory          = var.video_api_memory
  desired_count   = var.video_api_desired_count

  # Dependencies
  database_url           = module.rds.database_url
  s3_bucket_name         = module.s3.videos_bucket_name
  sqs_queue_url          = module.sqs.uploads_queue_url
  jwt_access_secret_arn  = module.secrets_manager.secret_arns["jwt_access_secret"]
  jwt_refresh_secret_arn = module.secrets_manager.secret_arns["jwt_refresh_secret"]

  # Optional SSL certificate
  certificate_arn = var.certificate_arn
}

# ECS Worker Service - Background processing service
module "ecs_service_worker" {
  source = "./modules/ecs_service_worker"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = data.aws_region.current.name
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  cluster_id         = module.ecs_cluster.cluster_id
  execution_role_arn = local.lab_role_arn
  task_role_arn      = local.lab_role_arn
  log_group_name     = module.ecs_cluster.log_group_name

  # Container configuration
  container_image = var.worker_image
  cpu             = var.worker_cpu
  memory          = var.worker_memory
  desired_count   = var.worker_desired_count

  # Dependencies
  database_url           = module.rds.database_url
  s3_bucket_name         = module.s3.videos_bucket_name
  sqs_queue_url          = module.sqs.uploads_queue_url
  jwt_access_secret_arn  = module.secrets_manager.secret_arns["jwt_access_secret"]
  jwt_refresh_secret_arn = module.secrets_manager.secret_arns["jwt_refresh_secret"]
}
