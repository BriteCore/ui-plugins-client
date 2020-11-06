#! /bin/bash

# Extract Package version
export PACKAGE_VERSION=$(node -pe "require('./package.json').version")
export FILENAME="britecore-ui-plugins.js"
# Check if the version is already published.
export IS_VERSION_PUBLISHED=$(aws s3 ls "s3://$S3_BUCKET/$PACKAGE_VERSION/$FILENAME")

if [[ ! $IS_VERSION_PUBLISHED ]]; then
    aws s3 cp dist/$FILENAME "s3://$S3_BUCKET/$PACKAGE_VERSION/$FILENAME" --acl=public-read
    aws s3 cp dist/$FILENAME "s3://$S3_BUCKET" --acl=public-read
    echo "published a new version to the CDN: $PACKAGE_VERSION"
else
    echo "version ${PACKAGE_VERSION} is already published."
fi
