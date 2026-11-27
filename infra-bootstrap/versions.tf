# Account baseline for Kimallus. The owner runs this by hand (plan, then apply).
# CI only runs fmt and validate, without AWS credentials: the deploy role must not
# be able to change its own permissions.
terraform {
  required_version = ">= 1.10" # use_lockfile (S3 native state locking)

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Partial configuration: bucket, key, region and use_lockfile come from backend.hcl,
  # which is not in the repo. The first run uses local state (backend_override.tf),
  # see docs/architecture.md section 5.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      project    = "kimallus"
      managed-by = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
