# Outputs for restricted ECS Worker Service
output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.worker.name
}

output "service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.worker.id
}

output "security_group_id" {
  description = "ID of the ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.worker.arn
}
