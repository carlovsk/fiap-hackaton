# Random suffix for idempotent resource naming
resource "random_id" "sqs_suffix" {
  byte_length = 4
}

# Dead Letter Queue for uploads
resource "aws_sqs_queue" "uploads_dlq" {
  name = "${var.project_name}-${var.environment}-uploads-dlq"

  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "${var.project_name}-${var.environment}-uploads-dlq"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "dead-letter-queue"
  }
}

# Dead Letter Queue for processed videos
resource "aws_sqs_queue" "processed_dlq" {
  name = "${var.project_name}-${var.environment}-processed-dlq"

  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "${var.project_name}-${var.environment}-processed-dlq"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "dead-letter-queue"
  }
}

# SQS Queue for Video Uploads
resource "aws_sqs_queue" "uploads" {
  name = "${var.project_name}-${var.environment}-uploads-queue-${random_id.sqs_suffix.hex}"

  # Message retention period (14 days)
  message_retention_seconds = 1209600

  # Visibility timeout (5 minutes - should be longer than lambda execution time)
  visibility_timeout_seconds = 300

  # Maximum message size (256 KB)
  max_message_size = 262144

  # Delivery delay
  delay_seconds = 0

  # Receive wait time (long polling)
  receive_wait_time_seconds = 20

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.uploads_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-uploads-queue"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "video-uploads"
  }
}

# SQS Queue for Processed Videos
resource "aws_sqs_queue" "processed" {
  name = "${var.project_name}-${var.environment}-processed-queue-${random_id.sqs_suffix.hex}"

  # Message retention period (14 days)
  message_retention_seconds = 1209600

  # Visibility timeout (5 minutes)
  visibility_timeout_seconds = 300

  # Maximum message size (256 KB)
  max_message_size = 262144

  # Delivery delay
  delay_seconds = 0

  # Receive wait time (long polling)
  receive_wait_time_seconds = 20

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.processed_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-processed-queue"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "processed-videos"
  }
}

# Note: IAM policies for SQS access removed for AWS Lab compatibility
# ECS tasks will use the existing LabRole which should have the necessary permissions
