#!/bin/bash
set -e

echo "=========================================="
echo "  EMS DEPLOY SCRIPT"
echo "=========================================="

# ── 1. Push to GitHub ──
echo ""
echo "📤 [1/3] Pushing to GitHub..."
cd "$(dirname "$0")"
git remote set-url origin git@github.com:HAFIZFARHAN630/employee-Panel-ClickTake.git 2>/dev/null || \
git remote set-url origin https://github.com/HAFIZFARHAN630/employee-Panel-ClickTake.git
git push -u origin main --force
echo "✅ GitHub push complete!"

# ── 2. Trigger Render redeploy ──
echo ""
echo "🚀 [2/3] Triggering Render redeploy..."
RENDER_DEPLOY_HOOK="https://api.render.com/v1/services/srv-cYOUR_SERVICE_ID/deploys"
echo "   ⚠️  Auto-redeploy not available. Go to:"
echo "   https://dashboard.render.com → employee-panel → Manual Deploy → Deploy latest commit"
echo "   Or Render will auto-deploy when it detects the push."

# ── 3. Firebase deploy ──
echo ""
echo "🔥 [3/3] Deploying to Firebase..."
if command -v firebase &> /dev/null; then
  firebase use panel-clicktake 2>/dev/null
  firebase deploy --only hosting
  echo "✅ Firebase deploy complete!"
else
  echo "   ⚠️  Firebase CLI not found. Run:"
  echo "   npm install -g firebase-tools"
  echo "   firebase login"
  echo "   firebase use panel-clicktake"
  echo "   firebase deploy --only hosting"
fi

echo ""
echo "=========================================="
echo "  ✅ DEPLOY COMPLETE!"
echo "=========================================="
echo ""
echo "  🌐 Firebase:  https://panel-clicktake.web.app/"
echo "  🚀 Render:    https://employee-panel-clicktake.onrender.com"
echo "  🗄️  Supabase:  https://supabase.com/dashboard/project/ggicuqmpkveegsjgmcvc"
echo ""