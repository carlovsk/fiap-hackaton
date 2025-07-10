# Variables for restricted ECS cluster
variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

# For restricted environments, you'll need to provide existing role ARNs
variable "execution_role_arn" {
  description = "ARN of existing ECS task execution role"
  type        = string
  default     = ""
}

variable "task_role_arn" {
  description = "ARN of existing ECS task role"
  type        = string
  default     = ""
}
