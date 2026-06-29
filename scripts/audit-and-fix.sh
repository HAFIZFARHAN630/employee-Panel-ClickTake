#!/bin/bash
# ============================================================
# EMS Automated System Audit Script
# Scans for: duplication, dummy data, broken imports,
# console leaks, lint errors, and missing API routes.
# ============================================================

set -uo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ISSUES=0

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  EMS Automated System Audit${NC}"
echo -e "${CYAN}  $(date)${NC}"
echo -e "${CYAN}========================================${NC}\n"

# ---- 1. Dummy / Hardcoded Data ----
echo -e "${CYAN}[1/6] Dummy/Hardcoded Data...${NC}"

# Check for hardcoded unreadCount (NOT useState(0))
if rg -n 'const unreadCount\s*=\s*[1-9]' src/components/ --glob '*.tsx' 2>/dev/null | head -5 | grep -v useState; then
  echo -e "  ${RED}✗ Found hardcoded unreadCount (not useState)${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No hardcoded unreadCount${NC}"
fi

# Check for hardcoded departmentAttendance arrays
if rg -n 'departmentAttendance:\s*\[' src/components/ --glob '*.tsx' 2>/dev/null | head -5; then
  echo -e "  ${RED}✗ Found hardcoded departmentAttendance${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No hardcoded departmentAttendance${NC}"
fi

# Check for TODO/FIXME/HACK with word boundaries
if rg -n '\b(TODO|FIXME|HACK)\b' src/components/ --glob '*.tsx' 2>/dev/null | head -5; then
  echo -e "  ${YELLOW}! Found TODO/FIXME/HACK comments${NC}"
else
  echo -e "  ${GREEN}✓ No TODO/FIXME/HACK comments${NC}"
fi
echo ""

# ---- 2. Duplicate Code ----
echo -e "${CYAN}[2/6] Duplicate Utility Functions...${NC}"
for fn in getInitials formatCurrency getStatusColor getPriorityColor getUserTypeColor; do
  matches=$(rg -n "^function ${fn}" src/components/ --glob '*.tsx' 2>/dev/null)
  if [ -n "$matches" ]; then
    count=$(echo "$matches" | wc -l | tr -d ' ')
    echo -e "  ${RED}✗ ${fn}: duplicated in ${count} file(s)${NC}"; ISSUES=$((ISSUES+count))
    echo "$matches"
  else
    echo -e "  ${GREEN}✓ ${fn}: properly shared via @/lib/utils${NC}"
  fi
done
echo ""

# ---- 3. Type Safety ----
echo -e "${CYAN}[3/6] Type Safety...${NC}"
if rg -n '@ts-ignore|@ts-nocheck' src/ --glob '*.{ts,tsx}' 2>/dev/null | head -5; then
  echo -e "  ${RED}✗ Found @ts-ignore/@ts-nocheck${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No @ts-ignore/@ts-nocheck${NC}"
fi
echo ""

# ---- 4. Console Leaks (frontend only) ----
echo -e "${CYAN}[4/6] Console Leaks (frontend)...${NC}"
if rg -n 'console\.(log|warn|debug)\(' src/components/ --glob '*.tsx' 2>/dev/null | head -5; then
  echo -e "  ${YELLOW}! Found console.log/warn/debug in frontend${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No console leaks in frontend${NC}"
fi
echo ""

# ---- 5. ESLint ----
echo -e "${CYAN}[5/6] ESLint...${NC}"
lint_output=$(bun run lint 2>&1)
if echo "$lint_output" | grep -q 'error'; then
  echo -e "  ${RED}✗ ESLint errors found${NC}"; ISSUES=$((ISSUES+1))
  echo "$lint_output" | tail -10
else
  echo -e "  ${GREEN}✓ ESLint passed${NC}"
fi
echo ""

# ---- 6. API Route Coverage ----
echo -e "${CYAN}[6/6] API Route Coverage...${NC}"
missing=0
# Extract API endpoints from frontend code (e.g. "/api/users" from api.get("/api/users"))
endpoints=$(rg --no-filename -o '"(/api/[^"]+)"' src/components/ --glob '*.tsx' 2>/dev/null | sed 's/"//g' | sort -u)
for endpoint in $endpoints; do
  # Strip query params
  clean_endpoint=$(echo "$endpoint" | cut -d'?' -f1)
  # Convert to file path
  route_path="src/app${clean_endpoint}"
  if [ ! -f "${route_path}/route.ts" ] && [ ! -f "${route_path}.ts" ]; then
    echo -e "  ${RED}✗ Missing route: ${clean_endpoint}${NC}"
    missing=$((missing+1))
  fi
done
if [ "$missing" -eq 0 ]; then
  echo -e "  ${GREEN}✓ All frontend API calls have matching routes${NC}"
else
  ISSUES=$((ISSUES+missing))
fi
echo ""

# ---- Summary ----
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  SUMMARY${NC}"
echo -e "${CYAN}========================================${NC}"
if [ "$ISSUES" -eq 0 ]; then
  echo -e "${GREEN}  ✓ ALL CHECKS PASSED${NC}\n"
else
  echo -e "${RED}  ✗ $ISSUES issue(s) found${NC}\n"
fi

echo "Audit complete at $(date) - Issues: $ISSUES" > /tmp/ems-audit-report.txt
exit 0