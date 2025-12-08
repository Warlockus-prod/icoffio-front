#!/bin/bash

# ============================================
# VERSION CHECK SCRIPT
# Проверяет синхронизацию версий перед коммитом
# ============================================

echo "🔍 VERSION CHECK"
echo "================"
echo ""

# Get last git tag
LAST_TAG=$(git tag -l | sort -V | tail -1)
echo "📌 Last git tag: $LAST_TAG"

# Get package.json version
PKG_VERSION=$(cat package.json | grep '"version"' | cut -d'"' -f4)
echo "📦 package.json: v$PKG_VERSION"

# Get version from admin page (last occurrence = actual version)
ADMIN_VERSION=$(grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' app/\[locale\]/admin/page.tsx | sort -V | tail -1)
echo "🖥️  Admin UI: v$ADMIN_VERSION"

# Get CHANGELOG first version
CHANGELOG_VERSION=$(grep -m 1 "## \[.*\]" CHANGELOG.md | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
echo "📝 CHANGELOG: v$CHANGELOG_VERSION"

echo ""
echo "---"
echo ""

# Check if package.json matches CHANGELOG
if [ "$PKG_VERSION" == "$CHANGELOG_VERSION" ]; then
  echo "✅ package.json ↔ CHANGELOG.md: MATCH"
else
  echo "❌ package.json ($PKG_VERSION) ↔ CHANGELOG.md ($CHANGELOG_VERSION): MISMATCH!"
  echo ""
  echo "⚠️  FIX: Update CHANGELOG.md to match package.json version"
  exit 1
fi

# Check if package.json matches Admin UI
if [ "$PKG_VERSION" == "$ADMIN_VERSION" ]; then
  echo "✅ package.json ↔ Admin UI: MATCH"
else
  echo "❌ package.json ($PKG_VERSION) ↔ Admin UI ($ADMIN_VERSION): MISMATCH!"
  echo ""
  echo "⚠️  FIX: Update app/[locale]/admin/page.tsx version"
  exit 1
fi

echo ""
echo "---"
echo ""

# Suggest next version
echo "📌 Last released: $LAST_TAG"
echo "📦 Current version: v$PKG_VERSION"
echo ""

# Parse versions
LAST_MAJOR=$(echo $LAST_TAG | cut -d'v' -f2 | cut -d'.' -f1)
LAST_MINOR=$(echo $LAST_TAG | cut -d'v' -f2 | cut -d'.' -f2)
LAST_PATCH=$(echo $LAST_TAG | cut -d'v' -f2 | cut -d'.' -f3)

CURR_MAJOR=$(echo $PKG_VERSION | cut -d'.' -f1)
CURR_MINOR=$(echo $PKG_VERSION | cut -d'.' -f2)
CURR_PATCH=$(echo $PKG_VERSION | cut -d'.' -f3)

# Check if current > last
if [ "$CURR_MAJOR" -gt "$LAST_MAJOR" ] || \
   ([ "$CURR_MAJOR" -eq "$LAST_MAJOR" ] && [ "$CURR_MINOR" -gt "$LAST_MINOR" ]) || \
   ([ "$CURR_MAJOR" -eq "$LAST_MAJOR" ] && [ "$CURR_MINOR" -eq "$LAST_MINOR" ] && [ "$CURR_PATCH" -gt "$LAST_PATCH" ]); then
  echo "✅ Version increment is CORRECT (v$LAST_TAG → v$PKG_VERSION)"
else
  echo "❌ Version increment is WRONG!"
  echo "   Last: v$LAST_TAG"
  echo "   Current: v$PKG_VERSION"
  echo ""
  echo "⚠️  Version must be GREATER than last tag!"
  exit 1
fi

echo ""
echo "---"
echo ""
echo "✅ VERSION CHECK PASSED"
echo ""
echo "💡 Next steps:"
echo "   1. Commit changes"
echo "   2. git tag v$PKG_VERSION"
echo "   3. git push origin main --tags"
echo ""

