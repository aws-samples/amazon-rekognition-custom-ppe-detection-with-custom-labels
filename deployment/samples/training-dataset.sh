#!/bin/bash

OUTDIR="dataset"
APIKEY_PEXELS=
APIKEY_UNSPLASH=

function usage() {
  echo -e "
------------------------------------------------------------------------------

This script requires 'jq' command. Please make sure you have 'jq' command
installed. You can download it from https://stedolan.github.io/jq/download/

It also requires a Pexels API Key and a Unsplash API Key as the dataset combines
images from both pexels.com and unsplash.com.

Create an account on https://www.pexels.com/api/ and copy and paste the
API Key to PEXELS_APIKEY

Create an account on https://unsplash.com/documentation and copy and paste
the Access Key to UNSPLASH_APIKEY.

The combined dataset will be downloaded to $OUTDIR

------------------------------------------------------------------------------
bash ./training-dataset.sh --pexels PEXELS_APIKEY --unsplash UNSPLASH_APIKEY

where
  --pexels    PEXELS_APIKEY    specify Pexels API Key
  --unsplash  UNSPLASH_APIKEY  specify Unsplash Access Key
"
  return 0
}

function download_pexels() {
  # Pexels Image IDs for training dataset
  local ids=(\
    1108101 \
    1216589 \
    159306 \
    159375 \
    209719 \
    2760243 \
    2965258 \
    3680957 \
    3680958 \
    3680959 \
    3681787 \
    3772616 \
    4481258 \
    4481262 \
    544966 \
    901941 \
  )
  local endpoint="https://api.pexels.com/v1/photos"
  for id in "${ids[@]}"; do
    url=$(curl --silent -H "Authorization: $APIKEY_PEXELS" "$endpoint/$id" | jq ".src.large" | tr -d '"')
    echo "Downloading pexels-${id}.jpg"
    (cd $OUTDIR; curl --silent "$url" --output "pexels-${id}.jpg")
  done;

}

function download_unsplash() {
  # Unsplash Image IDs for training dataset
  local ids=(\
    -Ktik1A__KY \
    04rZ7R1fKhY \
    2DK-CP_WAuw \
    4zwozQxDbD4 \
    CUTeHQGDaJ0 \
    Esi7nknKxmw \
    HbAEDtKQmmY \
    K3bHI_saaMw \
    MTMsK4cEF3M \
    Pj4je7OjrME \
    QCdRhVj7N8w \
    Tlyteh1470o \
    TtX79Vkm8gs \
    UmN4sJZ7NJg \
    VLPUm5wP5Z0 \
    WJg2bynUWOk \
    aBV8pVODWiM \
    bKGpAV4gFnc \
    fYD54gVXFGM \
    jCKC5W8s-cc \
    jYNvXKTUYvs \
    qvBYnMuNJ9A \
    s9XDWLJ_LyE \
    sYK-jN0sKBY \
    sgYamIzhAhg \
    sp8EfimTH0g \
    tUGLbI0fOfw \
    w7nR9j326Hw \
    x-ghf9LjrVg \
    y7243Bohj8I \
    zZza888FSKg \
    zmHxLsWtfBU \
  )
  local endpoint="https://api.unsplash.com/photos"
  for id in "${ids[@]}"; do
    url=$(curl --silent -H "Authorization: Client-ID $APIKEY_UNSPLASH" "$endpoint/$id/download" | jq ".url" | tr -d '"')
    echo "Downloading unsplash-${id}.jpg"
    (cd $OUTDIR; curl --silent "$url?&w=1920" --output "unsplash-${id}.jpg")
  done;
}

#
# Main Program
#
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
      -p|--pexels)
      APIKEY_PEXELS="$2"
      shift # past key
      shift # past value
      ;;
      -u|--unsplash)
      APIKEY_UNSPLASH="$2"
      shift # past key
      shift # past value
      ;;
      *)
      shift
      ;;
  esac
done

[ -z "$(which jq)" ] && \
  echo "error: jq is not installed" && \
  usage && \
  exit 1

[ -z "$APIKEY_PEXELS" ] && \
  echo "error: missing --pexels value" && \
  usage && \
  exit 1

[ -z "$APIKEY_UNSPLASH" ] && \
  echo "error: missing --unsplash value" && \
  usage && \
  exit 1

mkdir -p $OUTDIR
download_pexels
download_unsplash
