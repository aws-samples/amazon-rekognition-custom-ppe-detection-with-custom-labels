#!/bin/bash

########################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
########################################################################################
source ./common.sh

#
# @function usage
#
function usage() {
  echo -e "
------------------------------------------------------------------------------

This script should be run from the repo's deployment directory

------------------------------------------------------------------------------
cd deployment
bash ./build-s3-dist.sh --bucket BUCKET_NAME

where
  --bucket BUCKET_NAME  specify the bucket name where the templates and packages deployed to.
"
  return 0
}

######################################################################
#
# BUCKET must be defined through commandline option
#
# --bucket BUCKET_NAME
#
BUILD_ENV=
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
      -b|--bucket)
      BUCKET="$2"
      shift # past key
      shift # past value
      ;;
      -s|--solution)
      SOLUTION="$2"
      shift # past key
      shift # past value
      ;;
      -v|--version)
      VERSION="$2"
      shift # past key
      shift # past value
      ;;
      -d|--dev)
      BUILD_ENV="dev"
      shift # past key
      ;;
      -r|--single-region)
      SINGLE_REGION=true
      shift # past key
      ;;
      *)
      shift
      ;;
  esac
done

## configure global variables
NODEJS_VERSION=$(node --version)
DEPLOY_DIR="$PWD"
SOURCE_DIR="$DEPLOY_DIR/../source"
TEMPLATE_DIST_DIR="$DEPLOY_DIR/global-s3-assets"
BUILD_DIST_DIR="$DEPLOY_DIR/regional-s3-assets"
TMP_DIR=$(mktemp -d)

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

## Lambda layer package(s)
LAYER_IMAGEUTILS=
## modular workflow package(s)
PKG_CUSTOM_RESOURCES=
PKG_API=
PKG_WEBAPP=

## trap exit signal and make sure to remove the TMP_DIR
trap "rm -rf $TMP_DIR" EXIT

#
# @function clean_start
# @description
#   make sure to have a clean start
#
function clean_start() {
  echo "------------------------------------------------------------------------------"
  echo "Rebuild distribution"
  echo "------------------------------------------------------------------------------"
  local dir
  # remake dirs
  for dir in "$TEMPLATE_DIST_DIR" "$BUILD_DIST_DIR"; do
    rm -rf "$dir"
    runcmd mkdir -p "$dir"
  done
  # remove .DS_Store
  for dir in "$DEPLOY_DIR" "$SOURCE_DIR"; do
    find "$dir" -name '.DS_Store' -type f -delete
  done
  # delete all package-lock.json
  find "$SOURCE_DIR" -name 'package-lock.json' -type f -delete
}

function install_dev_dependencies() {
  echo "------------------------------------------------------------------------------"
  echo "Install node package dependencies"
  echo "------------------------------------------------------------------------------"
  pushd "$SOURCE_DIR"
  npm install -g \
    aws-sdk \
    aws-sdk-mock \
    browserify \
    chai \
    eslint \
    eslint-config-airbnb-base \
    eslint-plugin-import \
    mocha \
    nock \
    npm-run-all \
    sinon \
    sinon-chai \
    uglify-es
  popd
}

#
# @function build_cloudformation_templates
# @description
#   copy cloudformation templates
#   replace %PARAMS% variables with real names
#
function build_cloudformation_templates() {
  echo "------------------------------------------------------------------------------"
  echo "CloudFormation Templates"
  echo "------------------------------------------------------------------------------"
  # copy yaml to dist folder
  runcmd cp -rv *.yaml "$TEMPLATE_DIST_DIR/"
  pushd "$TEMPLATE_DIST_DIR"

  # solution name
  echo "Updating %SOLUTION% param in cloudformation templates..."
  sed -i'.bak' -e "s|%SOLUTION%|${SOLUTION}|g" *.yaml || exit 1

  # solution version
  echo "Updating %VERSION% param in cloudformation templates..."
  sed -i'.bak' -e "s|%VERSION%|${VERSION}|g" *.yaml || exit 1

  # deployment bucket name
  echo "Updating %BUCKET% param in cloudformation templates..."
  sed -i'.bak' -e "s|%BUCKET%|${BUCKET}|g" *.yaml || exit 1

  # key prefix name
  local keyprefix="${SOLUTION}/${VERSION}"
  echo "Updating %KEYPREFIX% param in cloudformation templates..."
  sed -i'.bak' -e "s|%KEYPREFIX%|${keyprefix}|g" *.yaml || exit 1

  # single region flag
  echo "Updating %SINGLE_REGION% param in cloudformation templates..."
  sed -i'.bak' -e "s|%SINGLE_REGION%|${SINGLE_REGION}|g" *.yaml || exit 1

  # layer(s)
  echo "Updating %LAYER_IMAGEUTILS% param in cloudformation templates..."
  sed -i'.bak' -e "s|%LAYER_IMAGEUTILS%|${LAYER_IMAGEUTILS}|g" *.yaml || exit 1

  # package(s)
  echo "Updating %PKG_CUSTOM_RESOURCES% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_CUSTOM_RESOURCES%|${PKG_CUSTOM_RESOURCES}|g" *.yaml || exit 1

  echo "Updating %PKG_API% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_API%|${PKG_API}|g" *.yaml || exit 1

  echo "Updating %PKG_WEBAPP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_WEBAPP%|${PKG_WEBAPP}|g" *.yaml || exit 1

  # remove .bak
  runcmd rm -v *.bak
  # rename .yaml to .template
  find . -name "*.yaml" -exec bash -c 'mv -v "$0" "${0%.yaml}.template"' {} \;
  # copy templates to regional bucket as well
  cp -v *.template "$BUILD_DIST_DIR"

  popd
}

#
# @function build_custom_resources_package
# @description
#   build custom resources package and copy to deployment/dist folder
#
function build_custom_resources_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building custom resources Lambda package"
  echo "------------------------------------------------------------------------------"
  local package="custom-resources"
  PKG_CUSTOM_RESOURCES="${SOLUTION}-${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_CUSTOM_RESOURCES" .
  cp -v "./dist/$PKG_CUSTOM_RESOURCES" "$BUILD_DIST_DIR"
  popd
}

#
# @function build_api_package
# @description
#   build api lambda package and copy to deployment/dist folder
#
function build_api_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building API Gateway lambda package"
  echo "------------------------------------------------------------------------------"
  local package="api"
  PKG_API="${SOLUTION}-${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_API" .
  cp -v "./dist/$PKG_API" "$BUILD_DIST_DIR"
  popd
}

#
# @function build_image_utils_layer
# @description
#   build layer packages and copy to deployment/dist folder
#
function build_image_utils_layer() {
  echo "------------------------------------------------------------------------------"
  echo "Building image utils layer"
  echo "------------------------------------------------------------------------------"
  local package="image-utils"
  LAYER_IMAGEUTILS="${SOLUTION}-layer-${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/layers/${package}"
  rm -r ./package-lock.json ./node_modules
  npm install
  npm run build
  npm run zip -- "$LAYER_IMAGEUTILS" .
  cp -v "./dist/${LAYER_IMAGEUTILS}" "$BUILD_DIST_DIR"
  popd
}

#
# @function minify_jscript
# @description
#   minify js files
#
function minify_jscript() {
  echo "------------------------------------------------------------------------------"
  echo "Minify Webapp code"
  echo "------------------------------------------------------------------------------"
  local file=$1
  pushd "$SOURCE_DIR/build"
  npm install --production
  node post-build.js minify --dir "$file"
  [ $? -ne 0 ] && exit 1
  popd
}

#
# @function compute_jscript_integrity
# @description
#   compute and inject SRI to index.html
#
function compute_jscript_integrity() {
  echo "------------------------------------------------------------------------------"
  echo "Compute and Inject Integrity check to webapp"
  echo "------------------------------------------------------------------------------"
  local file=$1
  pushd "$SOURCE_DIR/build"
  npm install --production
  node post-build.js inject-sri --html "$file"
  [ $? -ne 0 ] && exit 1
  popd
}

#
# @function build_webapp_package
# @description
#   build webapp package and copy to deployment/dist folder
#
function build_webapp_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building webapp package"
  echo "------------------------------------------------------------------------------"
  local package="webapp"
  PKG_WEBAPP="${SOLUTION}-${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build

  minify_jscript "$SOURCE_DIR/${package}/dist/src/lib/js"
  compute_jscript_integrity "$SOURCE_DIR/${package}/dist/index.html"

  # now, zip and package all the files
  npm run zip -- "$PKG_WEBAPP" . -x *.bak
  cp -v "./dist/$PKG_WEBAPP" "$BUILD_DIST_DIR"
  popd
}

function on_complete() {
  echo "------------------------------------------------------------------------------"
  echo "S3 Packaging Complete. (${SOLUTION} ${VERSION})"
  echo "------------------------------------------------------------------------------"
  echo "** LAYER_IMAGEUTILS=${LAYER_IMAGEUTILS} **"
  echo "** PKG_CUSTOM_RESOURCES=${PKG_CUSTOM_RESOURCES} **"
  echo "** PKG_API=${PKG_API} **"
  echo "** PKG_WEBAPP=${PKG_WEBAPP} **"
}

clean_start
install_dev_dependencies
build_custom_resources_package
build_image_utils_layer
build_api_package
build_webapp_package
build_cloudformation_templates
on_complete
