#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then
  echo 'Usage: ./run.sh <project-directory>' >&2
  exit 2
fi
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
developer_dir=$(xcode-select -p)
host="$developer_dir/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/host"
temporary_dir=$(mktemp -d "${TMPDIR:-/tmp}/cfa-swift-syntax.XXXXXX")
trap 'rm -rf "$temporary_dir"' EXIT HUP INT TERM
xcrun swiftc -module-cache-path "$temporary_dir/cache" -I "$host" -L "$host" \
  -Xlinker -rpath -Xlinker "$host" "$script_dir/../architecture-dashboard/src/syntax-inventory.swift" -o "$temporary_dir/inventory"
"$temporary_dir/inventory" "$1"
