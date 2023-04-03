#!/usr/bin/env bash

# change into the script directory, if not there already
cwd="$(dirname $(readlink -f "$0"))"
cd $cwd

# find and run npm update on all package.json (minus exclusions)
find ../.. -path ../../deprecated -prune -false -o -name 'package.json' -not -path "*/node_modules/*" -not -path "*/deprecated/*" -execdir npx npm-check-updates -u \;
