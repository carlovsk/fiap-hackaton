# Outputs for restricted ECS Video Service
output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.video_api.name
}

output "service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.video_api.id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_listener_arn" {
  description = "ARN of the ALB HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.video_api.arn
}

output "security_group_id" {
  description = "ID of the ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.video_api.arn
}
