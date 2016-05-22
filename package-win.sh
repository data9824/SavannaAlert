#!/bin/bash

rm -rf pack/SavannaAlert-win32-ia32/
./node_modules/.bin/electron-packager . SavannaAlert --platform=win32 --arch=ia32 --version=1.1.1 \
    --ignore=pack --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --ignore=node_modules/del \
    --ignore=node_modules/gulp \
    --ignore=node_modules/gulp-sass \
    --ignore=node_modules/gulp-typescript \
    --ignore=node_modules/gulp-webpack \
    --ignore=node_modules/webpack \
    --icon=resources/app.ico \
    --version-string.FileDescription=SavannaAlert \
    --version-string.ProductName=SavannaAlert \
    --version-string.OriginalFilename=SavannaAlert.exe \
    --version-string.LegalCopyright="CC0 1.0 Universal" \
    --out pack --overwrite
cp package.json pack/SavannaAlert-win32-ia32/resources/app/
cp -r node_modules/node-notifier/ pack/SavannaAlert-win32-ia32/resources/app/node_modules/
# 壊れたZIPファイルが生成されてしまう
# pushd .
# cd pack/
# rm SavannaAlert-win32-ia32.zip
# zip -r SavannaAlert-win32-ia32.zip SavannaAlert-win32-ia32
# popd
