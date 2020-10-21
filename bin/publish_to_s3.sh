#! /bin/bash

# Extract Package version
export PACKAGE_VERSION=$(node -pe "require('./package.json').version")

# Check if the version is already published.
export IS_VERSION_PUBLISHED=$(aws s3 ls "s3://$S3_BUCKET/$PACKAGE_VERSION/ui-plugins-client.js")

if [[ ! $IS_VERSION_PUBLISHED ]]; then
    aws s3 cp dist/britecore-ui-plugins.js "s3://$S3_BUCKET/$PACKAGE_VERSION/ui-plugins-client.js" --acl=public-read
    aws s3 cp dist/britecore-ui-plugins.js "s3://$S3_BUCKET" --acl=public-read
    echo "published a new version to the CDN: $PACKAGE_VERSION"
else
    echo "version ${PACKAGE_VERSION} is already published."
fi
