# S3 Module Outputs

output "videos_bucket_name" {
  description = "Name of the videos S3 bucket"
  value       = aws_s3_bucket.videos.bucket
}

output "videos_bucket_arn" {
  description = "ARN of the videos S3 bucket"
  value       = aws_s3_bucket.videos.arn
}

output "videos_bucket_domain_name" {
  description = "Domain name of the videos S3 bucket"
  value       = aws_s3_bucket.videos.bucket_domain_name
}

# Legacy outputs for backward compatibility
output "uploads_bucket_name" {
  description = "Name of the uploads S3 bucket (same as videos bucket)"
  value       = aws_s3_bucket.videos.bucket
}

output "uploads_bucket_arn" {
  description = "ARN of the uploads S3 bucket (same as videos bucket)"
  value       = aws_s3_bucket.videos.arn
}

output "processed_bucket_name" {
  description = "Name of the processed videos S3 bucket (same as videos bucket)"
  value       = aws_s3_bucket.videos.bucket
}

output "processed_bucket_arn" {
  description = "ARN of the processed videos S3 bucket (same as videos bucket)"
  value       = aws_s3_bucket.videos.arn
}

output "uploads_bucket_domain_name" {
  description = "Domain name of the uploads S3 bucket (same as videos bucket)"
  value       = aws_s3_bucket.videos.bucket_domain_name
}

output "processed_bucket_domain_name" {
  description = "Domain name of the processed videos S3 bucket (same as videos bucket)"
  value       = aws_s3_bucket.videos.bucket_domain_name
}
