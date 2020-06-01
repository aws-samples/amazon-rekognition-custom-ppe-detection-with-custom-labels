#!/bin/bash

#
# @function usage
#
function usage() {
  echo -e "
------------------------------------------------------------------------------

This script helps to clean up files and directories created by build script

------------------------------------------------------------------------------

bash ./clean-slate.sh [--path <root-path>]

where
  --path <root-path>  [optional] specify the root directory to start cleaning.
"
  return 0
}

ROOTDIR=
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
      -p|--path)
      ROOTDIR="$2"
      shift # past key
      shift # past value
      ;;
      *)
      shift
      ;;
  esac
done

[ -z "$ROOTDIR" ] && \
  ROOTDIR="."

function clean_deployment() {
  echo "------------------------------------------------------------------------------"
  echo "Cleaning deployment folder"
  echo "------------------------------------------------------------------------------"
  local startDir=$1
  for dir in "global-s3-assets" "regional-s3-assets" "open-source"; do
    find "${startDir}" -name "${dir}" -type d -exec rm -rfv "{}" \;
  done
}

function clean_source() {
  echo "------------------------------------------------------------------------------"
  echo "Cleaning source folder"
  echo "------------------------------------------------------------------------------"
  local startDir=$1
  for dir in "node_modules" "dist"; do
    find "${startDir}" -name "${dir}" -type d -exec rm -rfv "{}" \;
  done

  for file in "package-lock.json" ".DS_Store"; do
    find "${startDir}" -name "${file}" -type f -exec rm -rfv "{}" \;
  done
}

usage
clean_deployment "${ROOTDIR}"
clean_source "${ROOTDIR}"
