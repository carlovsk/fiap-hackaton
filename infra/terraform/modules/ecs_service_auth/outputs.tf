# ECS Service Auth Module Outputs

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.auth.name
}

output "service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.auth.id
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.auth.arn
}

output "target_group_arn" {
  description = "ARN of the load balancer target group"
  value       = aws_lb_target_group.auth.arn
}

output "security_group_id" {
  description = "ID of the ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.auth.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.auth.arn
}

output "listener_rule_arn" {
  description = "ARN of the ALB listener rule"
  value       = aws_lb_listener_rule.auth.arn
}
