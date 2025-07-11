# Outputs for restricted ECS cluster
output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "service_discovery_namespace_id" {
  description = "ID of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "service_discovery_namespace_name" {
  description = "Name of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

# In restricted mode, return the provided role ARNs or suggest default ones
output "execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = var.execution_role_arn != "" ? var.execution_role_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
}

output "task_role_arn" {
  description = "ARN of the ECS task role"
  value       = var.task_role_arn != "" ? var.task_role_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
}
