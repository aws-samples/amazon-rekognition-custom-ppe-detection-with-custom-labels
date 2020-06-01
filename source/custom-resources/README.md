# Amazon CloudFormation Custom Resource Lambda
Custom Resource allows you to write customized logic for provisioning certain resources. Learn more from [Custom Resources Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html).

This demo solution uses custom resource to perform the following customized actions upon stack creation:
* Creating an Amazon Rekognition Custom Labels Project
* Update Amazon S3 Bucket CORS rules to allow cross origins between the Amazon CloudFront distribution and the Amazon API Gateway RESTful API endpoint
* Copying web contents to the Amazon S3 web bucket
* Register a new user to the newly created Amazon Cognito User Pool

_Also note that the custom resource lambda is only used when creating, updating, and deleting a CloudFormation stack. The actual demo solution doesn't use this lambda function._

__

## Security
The custom resource is given a set of permission to access specific resources.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketCORS",
                "s3:PutBucketCORS"
            ],
            "Resource": "arn:aws:s3:::ml9800-*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::ml9800-*/*",
            "Effect": "Allow"
        },
        {
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::<build-bucket>/custom-ppe-detection/1.0.0/custom-ppe-detection-webapp-1.0.0.zip",
            "Effect": "Allow"
        },
        {
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:<region>:<account>:log-group:/aws/lambda/*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminUpdateUserAttributes",
                "cognito-idp:CreateGroup",
                "cognito-idp:CreateUserPool",
                "cognito-idp:CreateUserPoolClient",
                "cognito-idp:DeleteGroup",
                "cognito-idp:DeleteUserPool",
                "cognito-idp:DeleteUserPoolClient",
                "cognito-idp:DescribeUserPool",
                "cognito-idp:DescribeUserPoolClient",
                "cognito-idp:UpdateUserPool",
                "cognito-idp:UpdateUserPoolClient"
            ],
            "Resource": "arn:aws:cognito-idp:<region>:<account>:userpool/*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "cognito-idp:CreateUserPoolDomain",
                "cognito-idp:DeleteUserPoolDomain",
                "cognito-idp:DescribeUserPoolDomain"
            ],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": "iam:PassRole",
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": "rekognition:CreateProject",
            "Resource": "arn:aws:rekognition:<region>:<account>:project/*/*",
            "Effect": "Allow"
        }
    ]
}

```
__

## Updating Amazon S3 Bucket CORS Rules
The web application is hosted with Amazon CloudFront distribution where the origin is an Amazon S3 Bucket, the web bucket. However, the web application also calls RESTful APIs created by Amazon API Gateway to perform training and analysis. It also accesses a source Amazon S3 bucket to upload images. Therefore, we would need to configure the CORS rule to allow cross-origins.

An example of the CORS configuration on the web bucket.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
    <AllowedOrigin>https://{distribution-id}.cloudfront.net</AllowedOrigin>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <AllowedHeader>*</AllowedHeader>
</CORSRule>
</CORSConfiguration>

```
__

## Amazon Bucket Policy
As discussed in the README, the demo solution uses Amazon CloudFront distribution and Origin Access ID (OAID) to restrict direct access to the web bucket.

Here is an example of the Bucket policy being created by the solution

```json
{
    "Version": "2008-10-17",
    "Statement": [
        {
            "Effect": "Deny",
            "Principal": "*",
            "Action": "*",
            "Resource": "arn:aws:s3:::ml9800-<guid>-<region>-web/*",
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <GUID>"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::ml9800-<guid>-<region>-web/*"
        }
    ]
}
```

The bucket policy allows **GetObject** from Amazon CloudFront distribution only.

The **Deny** clause with **aws:SecureTransport** condition adds an extra layer of protection to ensure that only HTTPS request is accepted.

___

Back to [README](../../README.md)

