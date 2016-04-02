#!/bin/bash

rm -rf pack/SavannaAlert-darwin-x64/
./node_modules/.bin/electron-packager . SavannaAlert --platform=darwin --arch=x64 --version=0.36.12 \
    --ignore=pack --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --icon=resources/app.icns \
    --out pack --overwrite
cp package.json pack/SavannaAlert-darwin-x64/SavannaAlert.app/Contents/Resources/app/
cp -r node_modules/node-notifier/ pack/SavannaAlert-darwin-x64/SavannaAlert.app/Contents/Resources/app/node_modules/node-notifier
pushd .
cd pack/SavannaAlert-darwin-x64/
rm ../SavannaAlert-darwin-x64.zip
zip -r ../SavannaAlert-darwin-x64.zip SavannaAlert.app
popd
