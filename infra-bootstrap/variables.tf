variable "region" {
  description = "Region for regional resources (the state bucket). Budgets and IAM are global."
  type        = string
  default     = "eu-north-1"
}

variable "github_repo" {
  description = "GitHub repository (owner/name) whose production environment may assume the deploy role."
  type        = string
  default     = "Gerlitek/kimallus-peli"
}

variable "alert_email" {
  description = "Address for budget alerts. Set in terraform.tfvars, which is not in the repo."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "alert_email must be an email address."
  }
}
