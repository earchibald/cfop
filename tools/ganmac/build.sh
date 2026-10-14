#!/bin/sh
# Build ganmac next to this script. The Info.plist goes into the binary: macOS stops a
# Bluetooth tool that has no usage description.
set -e
cd "$(dirname "$0")"
swiftc -O main.swift -o ganmac -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker Info.plist
echo "Built $(pwd)/ganmac"
