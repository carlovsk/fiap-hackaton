# SQS Module Outputs

output "uploads_queue_url" {
  description = "URL of the uploads SQS queue"
  value       = aws_sqs_queue.uploads.url
}

output "uploads_queue_arn" {
  description = "ARN of the uploads SQS queue"
  value       = aws_sqs_queue.uploads.arn
}

output "processed_queue_url" {
  description = "URL of the processed SQS queue"
  value       = aws_sqs_queue.processed.url
}

output "processed_queue_arn" {
  description = "ARN of the processed SQS queue"
  value       = aws_sqs_queue.processed.arn
}

output "uploads_dlq_url" {
  description = "URL of the uploads dead letter queue"
  value       = aws_sqs_queue.uploads_dlq.url
}

output "processed_dlq_url" {
  description = "URL of the processed dead letter queue"
  value       = aws_sqs_queue.processed_dlq.url
}

# Note: IAM policy outputs removed for AWS Lab compatibility
