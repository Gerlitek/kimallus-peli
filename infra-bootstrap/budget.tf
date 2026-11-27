# Monthly budget for the whole account. A budget only notifies; costs are
# prevented by design and by the kill switch (CDK web stack).
# Alerts on actual spend only: forecast alerts at these amounts are noise.
locals {
  budget_limit_usd     = 6
  budget_alerts_at_usd = [2, 4, 6]
}

resource "aws_budgets_budget" "monthly" {
  name         = "kimallus-monthly"
  budget_type  = "COST"
  limit_amount = tostring(local.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = local.budget_alerts_at_usd

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.alert_email]
    }
  }
}
