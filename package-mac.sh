#!/bin/bash

rm -rf pack/SavannaAlert-darwin-x64/
./node_modules/.bin/electron-packager . SavannaAlert --platform=darwin --arch=x64 --version=1.1.1 \
    --ignore=pack --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --ignore=node_modules/del \
    --ignore=node_modules/gulp \
    --ignore=node_modules/gulp-sass \
    --ignore=node_modules/gulp-typescript \
    --ignore=node_modules/gulp-webpack \
    --ignore=node_modules/webpack \
    --icon=resources/app.icns \
    --out pack --overwrite
cp package.json pack/SavannaAlert-darwin-x64/SavannaAlert.app/Contents/Resources/app/
cp -r node_modules/node-notifier/ pack/SavannaAlert-darwin-x64/SavannaAlert.app/Contents/Resources/app/node_modules/node-notifier
pushd .
cd pack/SavannaAlert-darwin-x64/
rm ../SavannaAlert-darwin-x64.zip
zip -r ../SavannaAlert-darwin-x64.zip SavannaAlert.app
popd
