# Printed locally only. The role ARN goes to a GitHub environment variable, not the repo.
output "deploy_role_arn" {
  description = "Set as the variable AWS_DEPLOY_ROLE_ARN in the GitHub environment production."
  value       = aws_iam_role.deploy.arn
}

output "state_bucket" {
  description = "Bucket name for backend.hcl."
  value       = aws_s3_bucket.state.bucket
}
