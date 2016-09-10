#!/bin/bash

rm -rf release/SavannaAlert-darwin-x64/
./node_modules/.bin/electron-packager . SavannaAlert --platform=darwin --arch=x64 --version=1.3.5 \
    --ignore=release --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --icon=resources/app.icns \
    --out release --overwrite
cp -r node_modules/node-notifier/ release/SavannaAlert-darwin-x64/SavannaAlert.app/Contents/Resources/app/node_modules/node-notifier
pushd .
cd release/SavannaAlert-darwin-x64/
rm ../SavannaAlert-darwin-x64.zip
zip -r ../SavannaAlert-darwin-x64.zip SavannaAlert.app
popd
