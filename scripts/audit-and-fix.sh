#!/bin/bash
# ============================================================
# EMS Automated System Audit Script
# Scans for: duplication, dummy data, broken imports,
# console leaks, lint errors, and missing API routes.
# ============================================================

cd "$(dirname "$0")/.."

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ISSUES=0

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  EMS Automated System Audit${NC}"
echo -e "${CYAN}  $(date)${NC}"
echo -e "${CYAN}========================================${NC}\n"

# ---- 1. Dummy / Hardcoded Data ----
echo -e "${CYAN}[1/6] Dummy/Hardcoded Data...${NC}"
if rg -n 'unreadCount\s*=\s*[0-9]+' src/components/ -g '*.tsx' 2>/dev/null | head -5; then
  echo -e "  ${RED}✗ Found hardcoded unreadCount${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No hardcoded unreadCount${NC}"
fi

if rg 'departmentAttendance:\s*\[' src/ -g '*.tsx' 2>/dev/null | head -5; then
  echo -e "  ${RED}✗ Found hardcoded departmentAttendance${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No hardcoded departmentAttendance${NC}"
fi

if rg 'TODO|FIXME|HACK' src/components/ -g '*.tsx' 2>/dev/null | head -5; then
  echo -e "  ${YELLOW}! Found TODO/FIXME comments${NC}"
else
  echo -e "  ${GREEN}✓ No TODO/FIXME comments${NC}"
fi
echo ""

# ---- 2. Duplicate Code ----
echo -e "${CYAN}[2/6] Duplicate Utility Functions...${NC}"
for fn in getInitials formatCurrency getStatusColor getPriorityColor getUserTypeColor; do
  count=$(rg -c "^function ${fn}" src/components/ -g '*.tsx' 2>/dev/null | awk -F: '{s+=$NF}END{print s+0}')
  count=${count:-0}
  if [ "$count" -gt 0 ]; then
    echo -e "  ${RED}✗ ${fn}: duplicated in ${count} file(s)${NC}"; ISSUES=$((ISSUES+count))
    rg -n "^function ${fn}" src/components/ -g '*.tsx' 2>/dev/null
  else
    echo -e "  ${GREEN}✓ ${fn}: properly shared via @/lib/utils${NC}"
  fi
done
echo ""

# ---- 3. Type Safety ----
echo -e "${CYAN}[3/6] Type Safety...${NC}"
if rg '@ts-ignore|@ts-nocheck' src/ -g '*.{ts,tsx}' 2>/dev/null | head -5; then
  echo -e "  ${RED}✗ Found @ts-ignore/@ts-nocheck${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No @ts-ignore/@ts-nocheck${NC}"
fi
echo ""

# ---- 4. Console Leaks (frontend only) ----
echo -e "${CYAN}[4/6] Console Leaks (frontend)...${NC}"
if rg 'console\.(log|warn|debug)\(' src/components/ -g '*.tsx' 2>/dev/null | head -5; then
  echo -e "  ${YELLOW}! Found console.log/warn/debug in frontend${NC}"; ISSUES=$((ISSUES+1))
else
  echo -e "  ${GREEN}✓ No console leaks in frontend${NC}"
fi
echo ""

# ---- 5. ESLint ----
echo -e "${CYAN}[5/6] ESLint...${NC}"
if bun run lint 2>&1 | tail -1 | grep -q "error"; then
  echo -e "  ${RED}✗ ESLint errors found${NC}"; ISSUES=$((ISSUES+1))
  bun run lint 2>&1 | tail -10
else
  echo -e "  ${GREEN}✓ ESLint passed${NC}"
fi
echo ""

# ---- 6. API Route Coverage ----
echo -e "${CYAN}[6/6] API Route Coverage...${NC}"
missing=0
for endpoint in $(rg -o 'api\.(get|post|put|patch|delete)\(["\x27]([^"\x27]+)' src/components/ -g '*.tsx' -r '$2' 2>/dev/null | sort -u | sed 's|/api/||'); do
  route_path="src/app/api/$endpoint"
  route_path=$(echo "$route_path" | cut -d'?' -f1)
  if [ ! -f "${route_path}/route.ts" ] && [ ! -f "${route_path}.ts" ]; then
    echo -e "  ${RED}✗ Missing route: /api/$endpoint${NC}"
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

echo "Audit complete at $(date)" > /tmp/ems-audit-report.txt
echo "Issues: $ISSUES" >> /tmp/ems-audit-report.txt