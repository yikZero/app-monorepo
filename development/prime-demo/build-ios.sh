#!/bin/sh
# Build and ad-hoc sign the Prime demo iOS Simulator Debug .app.
# Does not boot the simulator or run doctor/setup.
# Always runs locked pod install --deployment with RN source-build flags.
# Snapshots live Podfile.lock and project.pbxproj (including local edits)
# before mutation and restores them on EXIT/INT/TERM/HUP.
# Does not git-checkout user state or keep a CocoaPods-generated project.
# --install-pods is a no-op compatibility alias.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
ENV_FILE="$SCRIPT_DIR/output/.environment.json"
DEMO_LOCK="$SCRIPT_DIR/environment/Podfile.lock"
IOS_DIR="$REPO_ROOT/apps/mobile/ios"
IOS_LOCK="$IOS_DIR/Podfile.lock"
IOS_PROJECT="$IOS_DIR/OneKeyWallet.xcodeproj/project.pbxproj"
WORKSPACE="$IOS_DIR/OneKeyWallet.xcworkspace"
DERIVED="$REPO_ROOT/.tmp/prime-demo/native-build"
APP_SRC="$DERIVED/Build/Products/Debug-iphonesimulator/OneKeyWallet.app"
APP_DEST="$REPO_ROOT/.tmp/prime-demo/native/OneKeyWallet.app"
UDID=""
RESTORE_DIR=""

usage() {
  echo "Usage: sh development/prime-demo/build-ios.sh [--udid <id>] [--install-pods]" >&2
  echo "UDID: --udid, else PRIME_DEMO_UDID, else output/.environment.json" >&2
  echo "Always runs locked pod install --deployment; restores Podfile.lock and project.pbxproj." >&2
  echo "--install-pods is a no-op compatibility alias." >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --udid)
      if [ "$#" -lt 2 ]; then
        usage
        exit 2
      fi
      UDID=$2
      shift 2
      ;;
    --install-pods)
      # Compatibility alias; locked pod install always runs.
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [ -z "$UDID" ] && [ -n "${PRIME_DEMO_UDID:-}" ]; then
  UDID=$PRIME_DEMO_UDID
fi

if [ -z "$UDID" ] && [ -f "$ENV_FILE" ]; then
  UDID=$(
    node -e 'const fs=require("fs"); const file=process.argv[1]; const parsed=JSON.parse(fs.readFileSync(file,"utf8")); process.stdout.write(parsed && typeof parsed.udid==="string" ? parsed.udid : "");' "$ENV_FILE"
  )
fi

if [ -z "$UDID" ]; then
  echo "Missing simulator UDID. Pass --udid, set PRIME_DEMO_UDID, or run: node development/prime-demo/demo.mjs setup" >&2
  exit 2
fi

if [ ! -d "$WORKSPACE" ]; then
  echo "Xcode workspace not found: $WORKSPACE" >&2
  exit 1
fi
if [ ! -f "$DEMO_LOCK" ]; then
  echo "Demo Podfile.lock not found: $DEMO_LOCK" >&2
  exit 1
fi
if [ ! -f "$IOS_LOCK" ]; then
  echo "Tracked Podfile.lock missing: $IOS_LOCK" >&2
  exit 1
fi
if [ ! -f "$IOS_PROJECT" ]; then
  echo "Tracked Xcode project missing: $IOS_PROJECT" >&2
  exit 1
fi

restore_tracked() {
  if [ -z "${RESTORE_DIR:-}" ] || [ ! -d "$RESTORE_DIR" ]; then
    RESTORE_DIR=""
    return 0
  fi
  mkdir -p "$(dirname "$IOS_LOCK")"
  mkdir -p "$(dirname "$IOS_PROJECT")"
  if [ -f "$RESTORE_DIR/Podfile.lock" ]; then
    cp "$RESTORE_DIR/Podfile.lock" "$IOS_LOCK"
  fi
  if [ -f "$RESTORE_DIR/project.pbxproj" ]; then
    cp "$RESTORE_DIR/project.pbxproj" "$IOS_PROJECT"
  fi
  rm -rf "$RESTORE_DIR"
  RESTORE_DIR=""
}

RESTORE_DIR=$(mktemp -d "${TMPDIR:-/tmp}/prime-demo-ios-restore.XXXXXX")
cp "$IOS_LOCK" "$RESTORE_DIR/Podfile.lock"
cp "$IOS_PROJECT" "$RESTORE_DIR/project.pbxproj"
trap restore_tracked EXIT
trap 'restore_tracked; exit 130' INT
trap 'restore_tracked; exit 143' TERM
trap 'restore_tracked; exit 129' HUP
cp "$DEMO_LOCK" "$IOS_LOCK"
(
  CDPATH= cd -- "$IOS_DIR"
  # This lock records source-built RN dependencies, not the prebuilt archive.
  RCT_USE_RN_DEP=0 RCT_USE_PREBUILT_RNCORE=0 pod install --deployment
)

mkdir -p "$DERIVED"

SKIP_BUNDLING=1 SENTRY_DISABLE_AUTO_UPLOAD=true ENABLE_NATIVE_BACKGROUND_THREAD=false \
  xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme OneKeyWallet \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "id=$UDID" \
  -derivedDataPath "$DERIVED" \
  -jobs 8 \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO

if [ ! -d "$APP_SRC" ]; then
  echo "Build did not produce $APP_SRC" >&2
  exit 1
fi

GP_BIN="$APP_SRC/Frameworks/GPChannelSDKCore.framework/GPChannelSDKCore"
if [ -f "$GP_BIN" ]; then
  codesign --force --sign - "$GP_BIN"
fi
codesign --force --deep --sign - "$APP_SRC"

PARTIAL="$APP_DEST.partial"
rm -rf "$PARTIAL"
mkdir -p "$(dirname "$APP_DEST")"
cp -R "$APP_SRC" "$PARTIAL"
rm -rf "$APP_DEST"
mv "$PARTIAL" "$APP_DEST"

echo "built $APP_DEST"
