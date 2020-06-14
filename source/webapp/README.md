# Webapp Component

The web application is written in ES6 and uses JQuery and Boostrap libraries.

___

# Limitations

The solution is designed to demonstrate how to prepare training dataset, train and run Amazon Rekognition Custom Labels model to identify specific PPE requirement such as High Visibility Safety Vest requirement. While it is fully functional solution, it is **not** meant to be a production-ready solution.

There are limitations with the web application:
* The web appliction doesn't display or manage history of analysis requests. However, the analysis request and detection results are stored in the Amazon S3 Source bucket. See [Navigating File Structure In Amazon S3 Source Bucket](../api/README.md#navigating-file-structure-in-amazon-s3-source-bucket) for details.
* The temporary security credential issued by Amazon Cognito expires in an hour. The web application doesn't automatically refresh the security token. If you experience timeout error, **reload** the page.

___

# Security

When you build systems on AWS infrastructure, security responsibilities are shared between you and AWS. This shared model can reduce your operational burden as AWS operates, manages, and controls the components from the host operating system and virtualization layer down to the physical security of the facilities in which the services operate. For more information about security on AWS, visit the [AWS Security Center](https://aws.amazon.com/security).

## Subresource Integrity (SRI)
Web application assets are secured using Subresource Integrity (SRI). Input/output encoding are performed to prevent Cross Site Scripting (XSS) attack.

Sign-in flow uses [Amazon Cognito](https://aws.amazon.com/cognito/) service to authenticate user.

HTTPS requests requires [AWS Signature V4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html).

___

Next to [Custom resources component](../custom-resources/README.md) | Back to [RESTful API, training and analysis components](../api/README.md) | Return to [README](../../README.md)

