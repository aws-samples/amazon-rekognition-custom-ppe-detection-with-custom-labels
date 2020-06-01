#!/bin/bash

########################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
########################################################################################

# include shared configuration file
source ./common.sh

NODEJS_VERSION=$(node --version)
DEPLOY_DIR="$PWD"
SOURCE_DIR="$DEPLOY_DIR/../source"
TEMPLATE_DIST_DIR="global-s3-assets"
BUID_DIST_DIR="regional-s3-assets"

#
# @function usage
#
function usage() {
  echo -e "
------------------------------------------------------------------------------

This script helps you to deploy CloudFormation templates to the bucket(s).
It should be run from the repo's deployment directory

------------------------------------------------------------------------------
cd deployment
bash ./deploy-s3-dist.sh --bucket BUCKET_NAME [--acl ACL_SETTING] [--profile AWS_PROFILE] [--region AWS_REGION]

where
  --bucket BUCKET_NAME        specify the bucket name where the templates and packages deployed to.

  --acl ACL_SETTING           [optional] if not specified, it deploys with 'bucket-owner-full-control' access
                              control setting. You could specify 'public-read' if you plan to share the solution
                              with other AWS accounts. Note that it requires your bucket to be configured to permit
                              'public-read' acl settings

  --profile AWS_PROFILE       [optional] specify the AWS CLI profile. If not specified, it assumes 'default'

  --region AWS_REGION         [optional] specify AWS_REGION. If not specified, it assumes 'us-east-1'
"
  return 0
}

######################################################################
#
# optional flags
#
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
      -b|--bucket)
      BUCKET="$2"
      shift # past argument
      shift # past value
      ;;
      -s|--solution)
      SOLUTION="$2"
      shift # past key
      shift # past value
      ;;
      -v|--version)
      VERSION="$2"
      shift # past argument
      shift # past value
      ;;
      --single-region)
      SINGLE_REGION=true
      shift # past argument
      ;;
      -a|--acl)
      ACL_SETTING="$2"
      shift # past argument
      shift # past value
      ;;
      -p|--profile)
      PROFILE="$2"
      shift # past argument
      shift # past value
      ;;
      -r|--region)
      REGION="$2"
      shift # past argument
      shift # past value
      ;;
      *)
      shift
      ;;
  esac
done

[ -z "$BUCKET" ] && \
  echo "error: missing --bucket parameter..." && \
  usage && \
  exit 1

[ -z "$VERSION" ] && \
  VERSION=$(cat "$SOURCE_DIR/.version")

[ -z "$VERSION" ] && \
  echo "error: can't find the versioning, please use --version parameter..." && \
  usage && \
  exit 1

[ -z "$SOLUTION" ] && \
  SOLUTION="custom-ppe-detection"

[ -z "$SINGLE_REGION" ] && \
  SINGLE_REGION=true

[ -z "$ACL_SETTING" ] && \
  ACL_SETTING="bucket-owner-full-control"

[ -z "$PROFILE" ] && \
  PROFILE="default"

[ -z "$REGION" ] && \
  REGION="us-east-1"

#
# @function copy_to_bucket
# @description copy solution to regional bucket
#
function copy_to_bucket() {
  local source=$1
  local bucket=$2

  aws s3api get-bucket-location \
  --bucket ${bucket} \
  --profile ${PROFILE} > /dev/null 2>&1

  local status=$?
  [ $status -ne 0 ] && \
    echo "bucket '${bucket}' not exists. skipping..." && \
    return 0

  echo "uploading package to '${bucket}' in '${REGION}' (${ACL_SETTING}) [${PROFILE}]..."
  aws s3 cp $source s3://${bucket}/${SOLUTION}/${VERSION}/ \
  --recursive \
  --acl ${ACL_SETTING} \
  --profile ${PROFILE} \
  --region ${REGION}
}

if [ "$SINGLE_REGION" == "true" ]; then
  # deploy to a single region
  echo "** '${SOLUTION} ($VERSION)' package will be deployed to '${BUCKET}' bucket in ${REGION} region **"
  copy_to_bucket ${BUID_DIST_DIR} "${BUCKET}"
else
  echo "'${SOLUTION} ($VERSION)' package will be deployed to '${BUCKET}-[region]' buckets: ${REGIONS[*]} regions"
  # special case, deploy to main bucket (without region suffix)
  copy_to_bucket ${BUID_DIST_DIR} "${BUCKET}" "us-east-1"

  # now, deploy to regional based buckets
  for region in ${REGIONS[@]}; do
    copy_to_bucket ${BUID_DIST_DIR} "${BUCKET}-${region}" "${region}"
  done
fi
