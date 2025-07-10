# Backend configuration for S3 state storage
# Used with: terraform init -backend-config=backend.hcl

bucket = "fiap-hackaton-terraform-state"
key    = "prod/terraform.tfstate"
region = "us-east-1"

# Enable state locking and consistency checking via DynamoDB
dynamodb_table = "fiap-hackaton-terraform-locks"
encrypt        = true
