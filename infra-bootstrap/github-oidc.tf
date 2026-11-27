# GitHub Actions signs in to AWS with OIDC: short-lived credentials, no stored keys.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # No thumbprint: AWS verifies GitHub's certificate through its own trusted CAs.
}

# Only jobs in this repo's "production" environment may assume the role.
# The environment allows only the main branch and requires the owner's approval,
# so the branch limit is enforced by GitHub, not by this condition.
data "aws_iam_policy_document" "deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:environment:production"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "kimallus-github-deploy"
  description          = "GitHub Actions deploy role for Kimallus (production environment only)"
  assume_role_policy   = data.aws_iam_policy_document.deploy_trust.json
  max_session_duration = 3600
}

# The role has no direct permissions to resources. It may only assume the roles
# that `cdk bootstrap` creates (default qualifier hnb659fds); CloudFormation does
# the actual changes with them.
data "aws_iam_policy_document" "deploy_assume_cdk" {
  statement {
    actions   = ["sts:AssumeRole"]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/cdk-hnb659fds-*"]
  }
}

resource "aws_iam_role_policy" "deploy_assume_cdk" {
  name   = "assume-cdk-bootstrap-roles"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy_assume_cdk.json
}
