# EduPrime - Operations & Health Check Manual

## Version 1.0.0 | January 2026

---

## Table of Contents
1. [Daily Operations Checklist](#1-daily-operations-checklist)
2. [Weekly Operations Tasks](#2-weekly-operations-tasks)
3. [Monthly Operations Tasks](#3-monthly-operations-tasks)
4. [Health Check Procedures](#4-health-check-procedures)
5. [Monitoring & Alerting](#5-monitoring--alerting)
6. [Backup & Recovery](#6-backup--recovery)
7. [Incident Response](#7-incident-response)
8. [Performance Optimization](#8-performance-optimization)
9. [Security Operations](#9-security-operations)
10. [Troubleshooting Guide](#10-troubleshooting-guide)

---

## 1. Daily Operations Checklist

### 🌅 Morning Routine (8:00 AM - 9:00 AM)

| # | Task | Priority | Responsible | Verification |
|---|------|----------|-------------|--------------|
| 1 | Check system health status | HIGH | SysAdmin | Visit `/health` endpoint |
| 2 | Review overnight logs | HIGH | SysAdmin | Check `backend/logs/` |
| 3 | Verify database connectivity | HIGH | SysAdmin | Test connection |
| 4 | Check disk space usage | MEDIUM | SysAdmin | `df -h` command |
| 5 | Review failed notifications | MEDIUM | Operations | Check notification logs |
| 6 | Verify backup completion | HIGH | SysAdmin | Check backup status |
| 7 | Check n8n workflow status | MEDIUM | Operations | n8n dashboard |

### Morning Health Check Command
```bash
# Quick system health check script
#!/bin/bash
echo "=== EduPrime Daily Health Check ==="
echo ""

# 1. API Health
echo "1. API Health Check..."
curl -s http://localhost:3000/health | jq .

# 2. Database Connection
echo "2. Database Connection..."
docker exec eduprime-db pg_isready -U eduprime_user

# 3. Disk Space
echo "3. Disk Space..."
df -h | grep -E '(Filesystem|/dev/)'

# 4. Container Status
echo "4. Container Status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 5. Recent Error Logs (last 50 lines)
echo "5. Recent Errors..."
grep -i "error" backend/logs/combined.log | tail -20

echo "=== Health Check Complete ==="
```

### 📊 Midday Tasks (12:00 PM - 1:00 PM)

| # | Task | Priority | Action |
|---|------|----------|--------|
| 1 | Review attendance marking | MEDIUM | Ensure all batches marked |
| 2 | Check pending fee reminders | MEDIUM | Verify reminders sent |
| 3 | Monitor API response times | LOW | Check for slow queries |
| 4 | Review new inquiries | MEDIUM | Assign to counselors |

### 🌙 Evening Tasks (5:00 PM - 6:00 PM)

| # | Task | Priority | Action |
|---|------|----------|--------|
| 1 | Verify attendance alerts sent | HIGH | Check notification logs |
| 2 | Review day's fee collections | MEDIUM | Dashboard check |
| 3 | Check inquiry follow-ups | MEDIUM | Verify calls made |
| 4 | Generate daily summary | LOW | Export if needed |
| 5 | Verify backup initiated | HIGH | Check backup job |

---

## 2. Weekly Operations Tasks

### Monday Tasks
| Task | Description | Command/Action |
|------|-------------|----------------|
| Review weekend logs | Check for any issues | `grep -i "error\|warn" logs/combined.log` |
| Update n8n workflows | Check workflow health | n8n dashboard review |
| Database vacuum | Optimize tables | `VACUUM ANALYZE;` |
| Clear old logs | Remove logs > 30 days | `find logs/ -mtime +30 -delete` |

### Wednesday Tasks
| Task | Description | Command/Action |
|------|-------------|----------------|
| Security scan | Check for vulnerabilities | `npm audit` |
| Performance review | Check slow queries | Review pg_stat_statements |
| Backup verification | Test backup restore | Restore to test DB |

### Friday Tasks
| Task | Description | Command/Action |
|------|-------------|----------------|
| Weekly report generation | Generate all reports | Dashboard → Reports |
| Data integrity check | Verify FK constraints | Run integrity scripts |
| Update documentation | Document any changes | Update relevant docs |

### Weekly Maintenance Script
```bash
#!/bin/bash
# Weekly Maintenance Script - Run every Sunday 2:00 AM

echo "=== Weekly Maintenance Started ==="
DATE=$(date +%Y-%m-%d)

# 1. Database Vacuum
echo "Running VACUUM ANALYZE..."
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "VACUUM ANALYZE;"

# 2. Log Rotation
echo "Rotating logs..."
mv backend/logs/combined.log "backend/logs/combined-$DATE.log"
mv backend/logs/error.log "backend/logs/error-$DATE.log"
gzip "backend/logs/combined-$DATE.log"
gzip "backend/logs/error-$DATE.log"

# 3. Clear old logs (older than 30 days)
echo "Clearing old logs..."
find backend/logs/ -name "*.gz" -mtime +30 -delete

# 4. Clear old uploads (temp files older than 7 days)
echo "Clearing temp uploads..."
find backend/uploads/temp/ -mtime +7 -delete

# 5. Database statistics update
echo "Updating database statistics..."
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "ANALYZE;"

# 6. Check and repair indexes
echo "Checking indexes..."
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "REINDEX DATABASE eduprime;"

echo "=== Weekly Maintenance Complete ==="
```

---

## 3. Monthly Operations Tasks

### First Week of Month
| Task | Description | Responsible |
|------|-------------|-------------|
| Generate monthly reports | Fee collection, attendance, performance | Admin |
| Review system performance | Response times, error rates | SysAdmin |
| Update user permissions | Review and update roles | Admin |
| Certificate renewals check | SSL, API keys expiry | SysAdmin |

### Second Week of Month
| Task | Description | Responsible |
|------|-------------|-------------|
| Database optimization | Analyze slow queries | DBA |
| Security audit | Review access logs | Security |
| Backup test restore | Full restore test | SysAdmin |
| Update dependencies | npm update (with testing) | DevOps |

### Third Week of Month
| Task | Description | Responsible |
|------|-------------|-------------|
| User feedback review | Collect and analyze | Product |
| Feature usage analysis | Analytics review | Product |
| Capacity planning | Review growth metrics | SysAdmin |

### Fourth Week of Month
| Task | Description | Responsible |
|------|-------------|-------------|
| End-of-month reports | Financial, operational | Admin |
| Audit log review | Security compliance | Security |
| Document updates | Update all documentation | All |
| Team training | Knowledge sharing | All |

---

## 4. Health Check Procedures

### 4.1 API Health Check

```bash
# Health Check Endpoint
GET http://localhost:3000/health

# Expected Response
{
  "success": true,
  "message": "EduPrime API is running",
  "timestamp": "2026-01-05T10:00:00.000Z",
  "version": "1.0.0"
}
```

### 4.2 Comprehensive Health Check Script

```bash
#!/bin/bash
# comprehensive-health-check.sh

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           EDUPRIME COMPREHENSIVE HEALTH CHECK                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. API Server Check
echo "▶ Checking API Server..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$API_RESPONSE" == "200" ]; then
    echo -e "  ${GREEN}✓ API Server: HEALTHY${NC}"
else
    echo -e "  ${RED}✗ API Server: DOWN (HTTP $API_RESPONSE)${NC}"
    ((ERRORS++))
fi

# 2. Database Connection
echo "▶ Checking Database..."
DB_STATUS=$(docker exec eduprime-db pg_isready -U eduprime_user 2>&1)
if [[ $DB_STATUS == *"accepting connections"* ]]; then
    echo -e "  ${GREEN}✓ Database: CONNECTED${NC}"
else
    echo -e "  ${RED}✗ Database: DISCONNECTED${NC}"
    ((ERRORS++))
fi

# 3. Database Table Count
echo "▶ Checking Database Tables..."
TABLE_COUNT=$(docker exec eduprime-db psql -U eduprime_user -d eduprime -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "  ${GREEN}✓ Tables Found: ${TABLE_COUNT}${NC}"

# 4. Container Status
echo "▶ Checking Containers..."
CONTAINERS=("eduprime-api" "eduprime-db" "eduprime-n8n")
for container in "${CONTAINERS[@]}"; do
    STATUS=$(docker inspect -f '{{.State.Status}}' $container 2>/dev/null)
    if [ "$STATUS" == "running" ]; then
        echo -e "  ${GREEN}✓ $container: RUNNING${NC}"
    else
        echo -e "  ${RED}✗ $container: $STATUS${NC}"
        ((ERRORS++))
    fi
done

# 5. Disk Space
echo "▶ Checking Disk Space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "  ${GREEN}✓ Disk Usage: ${DISK_USAGE}%${NC}"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "  ${YELLOW}⚠ Disk Usage: ${DISK_USAGE}% (Warning)${NC}"
else
    echo -e "  ${RED}✗ Disk Usage: ${DISK_USAGE}% (Critical)${NC}"
    ((ERRORS++))
fi

# 6. Memory Usage
echo "▶ Checking Memory..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    MEM_USAGE=$(top -l 1 | grep "PhysMem" | awk '{print $2}' | sed 's/M//')
    echo -e "  ${GREEN}✓ Memory in use: ${MEM_USAGE}MB${NC}"
else
    # Linux
    MEM_USAGE=$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2 }')
    echo -e "  ${GREEN}✓ Memory Usage: ${MEM_USAGE}${NC}"
fi

# 7. Recent Errors (last hour)
echo "▶ Checking Recent Errors..."
if [ -f "backend/logs/error.log" ]; then
    ERROR_COUNT=$(find backend/logs/error.log -mmin -60 -exec grep -c "error" {} \; 2>/dev/null || echo "0")
    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "  ${GREEN}✓ No errors in last hour${NC}"
    else
        echo -e "  ${YELLOW}⚠ $ERROR_COUNT errors in last hour${NC}"
    fi
else
    echo -e "  ${GREEN}✓ No error log file (clean)${NC}"
fi

# 8. n8n Workflows
echo "▶ Checking n8n Automation..."
N8N_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz 2>/dev/null)
if [ "$N8N_STATUS" == "200" ]; then
    echo -e "  ${GREEN}✓ n8n: HEALTHY${NC}"
else
    echo -e "  ${YELLOW}⚠ n8n: NOT REACHABLE (may be offline)${NC}"
fi

# 9. SSL Certificate (if applicable)
echo "▶ Checking SSL Certificate..."
if [ -f "/etc/ssl/certs/eduprime.crt" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/ssl/certs/eduprime.crt | cut -d= -f2)
    echo -e "  ${GREEN}✓ SSL Expires: $EXPIRY${NC}"
else
    echo -e "  ${YELLOW}⚠ SSL: Using HTTP (development mode)${NC}"
fi

# 10. Active Connections
echo "▶ Checking Active Connections..."
if [ -n "$(command -v ss)" ]; then
    CONNECTIONS=$(ss -tun | grep :3000 | wc -l)
    echo -e "  ${GREEN}✓ Active API Connections: $CONNECTIONS${NC}"
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL SYSTEMS HEALTHY - No issues detected${NC}"
else
    echo -e "${RED}✗ ISSUES DETECTED - $ERRORS problem(s) found${NC}"
fi
echo "════════════════════════════════════════════════════════════════"
echo "Health check completed at: $(date)"
```

### 4.3 Database Health Check

```sql
-- database-health-check.sql

-- 1. Check database size
SELECT pg_size_pretty(pg_database_size('eduprime')) AS database_size;

-- 2. Check table sizes
SELECT 
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- 3. Check active connections
SELECT 
    state,
    COUNT(*) as count
FROM pg_stat_activity
WHERE datname = 'eduprime'
GROUP BY state;

-- 4. Check for long-running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state != 'idle';

-- 5. Check index usage
SELECT 
    schemaname,
    relname,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan < 50
ORDER BY idx_scan;

-- 6. Check for table bloat
SELECT 
    schemaname,
    relname,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / nullif(n_live_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 7. Check replication lag (if applicable)
SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn
FROM pg_stat_replication;

-- 8. Check lock contention
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## 5. Monitoring & Alerting

### 5.1 Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold | Check Frequency |
|--------|-------------------|-------------------|-----------------|
| API Response Time | > 2s | > 5s | Every 1 min |
| Error Rate | > 1% | > 5% | Every 5 min |
| CPU Usage | > 70% | > 90% | Every 1 min |
| Memory Usage | > 80% | > 95% | Every 1 min |
| Disk Usage | > 80% | > 95% | Every 5 min |
| DB Connections | > 80 | > 100 | Every 1 min |
| Failed Logins | > 10/hr | > 50/hr | Every 5 min |
| Queue Size | > 100 | > 500 | Every 1 min |

### 5.2 Log Monitoring

```bash
# Monitor error logs in real-time
tail -f backend/logs/error.log

# Monitor all logs
tail -f backend/logs/combined.log

# Search for specific errors
grep -i "database" backend/logs/error.log | tail -50

# Count errors by type
grep -oP '"level":"\K[^"]+' backend/logs/combined.log | sort | uniq -c

# Monitor API requests
grep "POST\|GET\|PUT\|DELETE" backend/logs/combined.log | tail -100
```

### 5.3 Alert Configuration (Sample)

```yaml
# alerting-rules.yml (for Prometheus/AlertManager)
groups:
  - name: eduprime-alerts
    rules:
      - alert: APIDown
        expr: up{job="eduprime-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "EduPrime API is down"
          description: "API server has been unreachable for 1 minute"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5%"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connections high"
          description: "PostgreSQL connections above 80"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space running low"
          description: "Less than 20% disk space remaining"
```

---

## 6. Backup & Recovery

### 6.1 Backup Schedule

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full Database | Daily 2:00 AM | 30 days | S3/Cloud Storage |
| Incremental | Every 6 hours | 7 days | Local + S3 |
| Transaction Logs | Continuous | 7 days | Local |
| File Uploads | Daily | 30 days | S3 |
| Configuration | On change | 90 days | Git |

### 6.2 Backup Scripts

```bash
#!/bin/bash
# daily-backup.sh

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/backups/eduprime"
S3_BUCKET="s3://eduprime-backups"

echo "=== Starting Daily Backup ==="

# 1. Database Backup
echo "Backing up database..."
docker exec eduprime-db pg_dump -U eduprime_user -d eduprime -F c -f /tmp/eduprime_$DATE.dump
docker cp eduprime-db:/tmp/eduprime_$DATE.dump $BACKUP_DIR/db/

# Compress
gzip $BACKUP_DIR/db/eduprime_$DATE.dump

# 2. Upload Folder Backup
echo "Backing up uploads..."
tar -czf $BACKUP_DIR/uploads/uploads_$DATE.tar.gz backend/uploads/

# 3. Configuration Backup
echo "Backing up configuration..."
cp .env $BACKUP_DIR/config/.env_$DATE
cp docker-compose.yml $BACKUP_DIR/config/docker-compose_$DATE.yml

# 4. Upload to S3 (if configured)
if command -v aws &> /dev/null; then
    echo "Uploading to S3..."
    aws s3 cp $BACKUP_DIR/db/eduprime_$DATE.dump.gz $S3_BUCKET/db/
    aws s3 cp $BACKUP_DIR/uploads/uploads_$DATE.tar.gz $S3_BUCKET/uploads/
fi

# 5. Clean old backups (keep 30 days)
echo "Cleaning old backups..."
find $BACKUP_DIR -type f -mtime +30 -delete

echo "=== Backup Complete ==="
echo "Database: $BACKUP_DIR/db/eduprime_$DATE.dump.gz"
echo "Uploads: $BACKUP_DIR/uploads/uploads_$DATE.tar.gz"
```

### 6.3 Recovery Procedures

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore-database.sh <backup_file.dump.gz>"
    exit 1
fi

echo "=== Starting Database Restore ==="
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# 1. Stop API server
echo "Stopping API server..."
docker stop eduprime-api

# 2. Decompress backup
echo "Decompressing backup..."
gunzip -k $BACKUP_FILE

# 3. Drop existing database
echo "Dropping existing database..."
docker exec eduprime-db psql -U postgres -c "DROP DATABASE IF EXISTS eduprime;"
docker exec eduprime-db psql -U postgres -c "CREATE DATABASE eduprime OWNER eduprime_user;"

# 4. Restore database
echo "Restoring database..."
DUMP_FILE="${BACKUP_FILE%.gz}"
docker cp $DUMP_FILE eduprime-db:/tmp/restore.dump
docker exec eduprime-db pg_restore -U eduprime_user -d eduprime /tmp/restore.dump

# 5. Start API server
echo "Starting API server..."
docker start eduprime-api

# 6. Verify
echo "Verifying restore..."
sleep 5
curl -s http://localhost:3000/health

echo "=== Restore Complete ==="
```

---

## 7. Incident Response

### 7.1 Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 - Critical | System down, data loss | 15 minutes | API down, DB corruption |
| P2 - High | Major feature broken | 1 hour | Login failing, fee collection down |
| P3 - Medium | Feature degraded | 4 hours | Slow queries, notification delays |
| P4 - Low | Minor issues | 24 hours | UI bugs, typos |

### 7.2 Incident Response Checklist

```markdown
## Incident Response Checklist

### Initial Response (0-15 minutes)
- [ ] Acknowledge incident
- [ ] Assess severity level
- [ ] Notify stakeholders
- [ ] Create incident channel/ticket
- [ ] Begin investigation

### Investigation (15-60 minutes)
- [ ] Check system health dashboard
- [ ] Review recent deployments
- [ ] Check error logs
- [ ] Identify affected components
- [ ] Identify root cause

### Resolution
- [ ] Implement fix or workaround
- [ ] Test fix
- [ ] Deploy fix
- [ ] Monitor for regression
- [ ] Confirm resolution

### Post-Incident
- [ ] Document timeline
- [ ] Write post-mortem
- [ ] Identify preventive measures
- [ ] Update runbooks
- [ ] Share learnings
```

### 7.3 Common Incidents & Solutions

#### Incident: API Not Responding
```bash
# 1. Check container status
docker ps | grep eduprime

# 2. Check logs
docker logs eduprime-api --tail 100

# 3. Restart API server
docker restart eduprime-api

# 4. If still failing, check database
docker exec eduprime-db pg_isready -U eduprime_user

# 5. Full stack restart
docker-compose down
docker-compose up -d
```

#### Incident: Database Connection Errors
```bash
# 1. Check database status
docker exec eduprime-db pg_isready -U eduprime_user

# 2. Check connection count
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Kill idle connections
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';"

# 4. Restart database
docker restart eduprime-db
```

#### Incident: High Memory Usage
```bash
# 1. Check memory usage
docker stats --no-stream

# 2. Check for memory leaks in logs
grep -i "memory\|heap" backend/logs/error.log

# 3. Restart API (temporary fix)
docker restart eduprime-api

# 4. Increase memory limit (docker-compose.yml)
# services:
#   api:
#     deploy:
#       resources:
#         limits:
#           memory: 2G
```

---

## 8. Performance Optimization

### 8.1 Database Optimization

```sql
-- 1. Identify slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Add missing indexes (run EXPLAIN ANALYZE on slow queries)
-- Example: If student search is slow
CREATE INDEX CONCURRENTLY idx_students_search 
ON students USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- 3. Update statistics
ANALYZE students;
ANALYZE student_fees;
ANALYZE student_attendance;

-- 4. Vacuum tables
VACUUM (VERBOSE, ANALYZE) students;
VACUUM (VERBOSE, ANALYZE) student_fees;
```

### 8.2 Application Optimization

```javascript
// 1. Enable response compression (already in app.js)
app.use(compression());

// 2. Implement caching for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key, fetchFn) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    const data = fetchFn();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
}

// 3. Use database connection pooling (already configured)
// config/database.js
const pool = new Pool({
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

### 8.3 Performance Benchmarks

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API Response (p50) | < 100ms | TBD | ⏳ |
| API Response (p95) | < 500ms | TBD | ⏳ |
| Database Query (avg) | < 50ms | TBD | ⏳ |
| Page Load Time | < 2s | TBD | ⏳ |
| Time to First Byte | < 200ms | TBD | ⏳ |

---

## 9. Security Operations

### 9.1 Security Checklist

| Task | Frequency | Last Done | Status |
|------|-----------|-----------|--------|
| Review access logs | Daily | | ⏳ |
| Check failed logins | Daily | | ⏳ |
| Update dependencies | Weekly | | ⏳ |
| Security scan (npm audit) | Weekly | | ⏳ |
| Review user permissions | Monthly | | ⏳ |
| Password policy audit | Monthly | | ⏳ |
| SSL certificate check | Weekly | | ⏳ |
| Penetration testing | Quarterly | | ⏳ |

### 9.2 Security Monitoring Commands

```bash
# Check failed login attempts
grep "Login failed" backend/logs/combined.log | tail -50

# Check for suspicious IPs
grep -oP 'IP: \K[0-9.]+' backend/logs/combined.log | sort | uniq -c | sort -rn | head -20

# Check npm vulnerabilities
cd backend && npm audit

# Check for outdated packages
npm outdated

# Monitor authentication events
grep -E "login|logout|auth" backend/logs/combined.log | tail -100
```

### 9.3 Security Incident Response

```markdown
## Security Incident Response

### Suspected Data Breach
1. Immediately disable affected accounts
2. Revoke all JWT tokens (change JWT_SECRET)
3. Force password reset for all users
4. Preserve logs for investigation
5. Notify affected parties
6. Report to relevant authorities (if required)

### Suspicious Login Activity
1. Check IP geolocation
2. Review login history for user
3. Temporarily lock account
4. Contact user to verify
5. Reset password if confirmed breach
```

---

## 10. Troubleshooting Guide

### 10.1 Common Issues & Solutions

#### Issue: "Cannot connect to database"
```bash
# Solution 1: Check if database is running
docker ps | grep eduprime-db

# Solution 2: Check database logs
docker logs eduprime-db --tail 50

# Solution 3: Restart database
docker restart eduprime-db

# Solution 4: Check connection string in .env
cat .env | grep DATABASE_URL
```

#### Issue: "JWT token invalid"
```bash
# Solution 1: Check if JWT_SECRET is set
cat .env | grep JWT_SECRET

# Solution 2: Clear browser localStorage and re-login
# In browser console:
localStorage.clear()
sessionStorage.clear()

# Solution 3: Restart API to reload env
docker restart eduprime-api
```

#### Issue: "Notifications not sending"
```bash
# Solution 1: Check notification service logs
grep -i "notification\|whatsapp\|sms" backend/logs/combined.log | tail -50

# Solution 2: Verify API keys
cat .env | grep -E "WHATSAPP|SMS|EMAIL"

# Solution 3: Check n8n workflow status
# Visit http://localhost:5678 and check workflow execution history

# Solution 4: Test notification manually
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"student_ids":[1],"channel":"email","message":"Test"}'
```

#### Issue: "Slow API responses"
```bash
# Solution 1: Check database query performance
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Solution 2: Check for long-running queries
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "SELECT pid, query, now() - query_start AS duration FROM pg_stat_activity WHERE state = 'active';"

# Solution 3: Run VACUUM ANALYZE
docker exec eduprime-db psql -U eduprime_user -d eduprime -c "VACUUM ANALYZE;"

# Solution 4: Check API server memory
docker stats eduprime-api --no-stream
```

### 10.2 Log Analysis Commands

```bash
# Find all errors in last hour
grep -i "error" backend/logs/combined.log | awk -v d="$(date -d '1 hour ago' '+%Y-%m-%d %H')" '$0 ~ d'

# Count errors by type
grep -oP '"message":"\K[^"]+' backend/logs/error.log | sort | uniq -c | sort -rn

# Find slowest API calls
grep -oP '"responseTime":\K[0-9]+' backend/logs/combined.log | sort -rn | head -20

# Track specific user activity
grep "user_id\":\"<USER_ID>\"" backend/logs/combined.log

# Export logs for analysis
grep "2026-01-05" backend/logs/combined.log > logs_20260105.json
```

### 10.3 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| System Admin | TBD | TBD | TBD |
| Database Admin | TBD | TBD | TBD |
| On-Call Engineer | TBD | TBD | TBD |
| Manager | TBD | TBD | TBD |

---

## Appendix

### A. Environment Variables Reference

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/eduprime
DB_POOL_SIZE=20

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Communication
WHATSAPP_API_KEY=your-key
WHATSAPP_PHONE_ID=your-phone-id
SMTP_HOST=smtp.example.com
SMTP_USER=user@example.com
SMTP_PASS=password

# Payment
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### B. Important File Locations

| Purpose | Path |
|---------|------|
| Application Logs | `backend/logs/` |
| Error Logs | `backend/logs/error.log` |
| Combined Logs | `backend/logs/combined.log` |
| Uploads | `backend/uploads/` |
| Configuration | `.env` |
| Docker Config | `docker-compose.yml` |
| Database Schema | `database/schema.sql` |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | EduPrime Team | Initial operations manual |

---

*This document is part of the EduPrime Institute Management System documentation.*
