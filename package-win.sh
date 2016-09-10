#!/bin/bash

rm -rf release/SavannaAlert-win32-ia32/
./node_modules/.bin/electron-packager . SavannaAlert --platform=win32 --arch=ia32 --version=1.3.5 \
    --ignore=release --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --icon=resources/app.ico \
    --version-string.FileDescription=SavannaAlert \
    --version-string.ProductName=SavannaAlert \
    --version-string.OriginalFilename=SavannaAlert.exe \
    --version-string.LegalCopyright="CC0 1.0 Universal" \
    --out release --overwrite
cp -r node_modules/node-notifier/ pack/SavannaAlert-win32-ia32/resources/app/node_modules/
# 壊れたZIPファイルが生成されてしまう
# pushd .
# cd release/
# rm SavannaAlert-win32-ia32.zip
# zip -r SavannaAlert-win32-ia32.zip SavannaAlert-win32-ia32
# popd
