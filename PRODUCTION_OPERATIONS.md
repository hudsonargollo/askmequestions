# Capitão Caverna Image Engine - Production Operations Guide

## Overview

This document provides comprehensive operational guidance for the Capitão Caverna Image Engine production environment. It covers API documentation, monitoring procedures, troubleshooting guides, and maintenance tasks.

## Table of Contents

1. [API Documentation](#api-documentation)
2. [Monitoring and Alerting](#monitoring-and-alerting)
3. [Troubleshooting Guide](#troubleshooting-guide)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Security Operations](#security-operations)
6. [Performance Optimization](#performance-optimization)
7. [Disaster Recovery](#disaster-recovery)

## API Documentation

### Authentication

All API endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### 1. Image Generation

**POST** `/api/v1/images/generate`

Generate a new image based on specified parameters.

**Request Body:**
```json
{
  "params": {
    "pose": "arms_crossed",
    "outfit": "hoodie_sweatpants",
    "footwear": "air_jordan_1_chicago",
    "prop": "cave_map",
    "frameType": "standard",
    "frameId": "01A"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imageId": "uuid-here",
    "status": "PENDING",
    "estimatedTime": 30000
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters or content safety violation
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Internal server error

#### 2. Image Status

**GET** `/api/v1/images/{imageId}/status`

Check the status of an image generation request.

**Response:**
```json
{
  "success": true,
  "data": {
    "imageId": "uuid-here",
    "status": "COMPLETE",
    "publicUrl": "https://r2-bucket-url/image.png",
    "generationTime": 25000,
    "serviceUsed": "midjourney"
  }
}
```

#### 3. User Images

**GET** `/api/v1/images/user/{userId}`

Retrieve images for a specific user.

**Query Parameters:**
- `limit` (optional): Number of images to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (PENDING, COMPLETE, FAILED)

#### 4. Health Check

**GET** `/health`

System health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-30T12:00:00Z",
  "checks": {
    "database": {"status": "pass", "responseTime": 45},
    "storage": {"status": "pass", "responseTime": 120},
    "externalServices": {"status": "pass"},
    "memory": {"status": "pass"},
    "performance": {"status": "pass"}
  }
}
```

#### 5. Metrics

**GET** `/metrics`

System metrics for monitoring.

### Admin Endpoints

#### Security Report

**GET** `/api/v1/admin/security/report`

Generate security report (admin only).

#### Audit Logs

**GET** `/api/v1/admin/security/audit`

Retrieve security audit logs (admin only).

**Query Parameters:**
- `limit`: Number of logs to return
- `offset`: Pagination offset
- `risk_level`: Filter by risk level (low, medium, high)
- `action`: Filter by action type

## Monitoring and Alerting

### Key Metrics to Monitor

#### System Health
- **Health Check Status**: Monitor `/health` endpoint
- **Response Time**: Average API response times
- **Error Rate**: Percentage of failed requests
- **Uptime**: System availability percentage

#### Image Generation
- **Generation Success Rate**: Percentage of successful image generations
- **Average Generation Time**: Time from request to completion
- **Queue Length**: Number of pending generation requests
- **Service Availability**: Status of external AI services

#### Database Performance
- **Query Response Time**: Average database query time
- **Connection Count**: Number of active database connections
- **Storage Usage**: Database size and growth rate
- **Index Performance**: Query optimization metrics

#### Storage (R2)
- **Upload Success Rate**: Percentage of successful uploads
- **Storage Usage**: Total storage consumed
- **Bandwidth Usage**: Data transfer metrics
- **CDN Performance**: Cache hit rates and response times

#### Security
- **Failed Authentication Attempts**: Number of failed logins
- **Rate Limit Violations**: Number of rate limit hits
- **Content Safety Violations**: Blocked content attempts
- **Abuse Detection**: Flagged suspicious activities

### Alerting Thresholds

#### Critical Alerts (Immediate Response Required)
- Health check status: `unhealthy`
- Error rate: > 10%
- Database response time: > 5 seconds
- Storage upload failure rate: > 5%
- Security violations: > 10 per hour

#### Warning Alerts (Monitor Closely)
- Health check status: `degraded`
- Error rate: > 5%
- Database response time: > 2 seconds
- Average generation time: > 60 seconds
- Rate limit hits: > 50 per hour

#### Info Alerts (Awareness)
- High traffic: > 1000 requests per hour
- Storage usage: > 80% of quota
- Long queue: > 20 pending generations

### Monitoring Setup

#### Cloudflare Analytics
1. Enable Analytics in Cloudflare Dashboard
2. Set up custom metrics for image generation
3. Configure alerts for critical thresholds

#### External Monitoring
1. Set up external health check monitoring (e.g., Pingdom, UptimeRobot)
2. Monitor from multiple geographic locations
3. Configure escalation policies

## Troubleshooting Guide

### Common Issues

#### 1. High Error Rate

**Symptoms:**
- Increased 500 errors
- Health check failures
- User complaints

**Diagnosis:**
```bash
# Check recent error logs
wrangler tail --format pretty

# Check database connectivity
curl https://your-worker.workers.dev/health

# Check external service status
curl https://your-worker.workers.dev/metrics
```

**Resolution:**
1. Check external AI service status
2. Verify database connectivity
3. Check R2 bucket accessibility
4. Review recent deployments
5. Scale resources if needed

#### 2. Slow Response Times

**Symptoms:**
- High response times in metrics
- User complaints about slowness
- Timeout errors

**Diagnosis:**
```bash
# Check performance metrics
curl https://your-worker.workers.dev/metrics

# Monitor database query times
# Check R2 upload/download speeds
```

**Resolution:**
1. Optimize database queries
2. Check R2 bucket performance
3. Review external service response times
4. Consider caching improvements
5. Scale database resources

#### 3. Rate Limit Issues

**Symptoms:**
- 429 errors
- User complaints about access denied
- High rate limit violations in security logs

**Diagnosis:**
```bash
# Check security audit logs
curl -H "Authorization: Bearer <admin-token>" \
  https://your-worker.workers.dev/api/v1/admin/security/audit?action=rate_limit_exceeded

# Review rate limit configuration
```

**Resolution:**
1. Review rate limit thresholds
2. Check for abuse patterns
3. Adjust limits if legitimate traffic
4. Implement user-specific limits
5. Consider implementing queuing

#### 4. Content Safety Violations

**Symptoms:**
- Blocked content requests
- User complaints about rejected prompts
- High content safety violations

**Diagnosis:**
```bash
# Check content safety logs
curl -H "Authorization: Bearer <admin-token>" \
  https://your-worker.workers.dev/api/v1/admin/security/audit?action=content_safety_violation
```

**Resolution:**
1. Review blocked content patterns
2. Adjust content safety filters if too strict
3. Provide better user feedback
4. Update blocked keywords list
5. Implement content suggestion system

### Emergency Procedures

#### Service Outage
1. **Immediate Response** (0-5 minutes)
   - Check health endpoint
   - Verify external service status
   - Check Cloudflare status page

2. **Investigation** (5-15 minutes)
   - Review error logs
   - Check database connectivity
   - Verify R2 bucket access
   - Check recent deployments

3. **Resolution** (15+ minutes)
   - Rollback if recent deployment caused issue
   - Scale resources if capacity issue
   - Contact external service providers
   - Implement temporary workarounds

#### Data Loss Prevention
1. **Database Issues**
   - Immediate backup if possible
   - Check D1 replication status
   - Contact Cloudflare support

2. **Storage Issues**
   - Verify R2 bucket integrity
   - Check backup systems
   - Implement recovery procedures

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Check health endpoint status
- [ ] Review error logs
- [ ] Monitor key metrics
- [ ] Check security audit logs

#### Weekly
- [ ] Review performance trends
- [ ] Clean up old audit logs
- [ ] Check storage usage
- [ ] Update security reports
- [ ] Review rate limit effectiveness

#### Monthly
- [ ] Database performance review
- [ ] Security audit and review
- [ ] Capacity planning review
- [ ] Update documentation
- [ ] Review and update monitoring thresholds

### Database Maintenance

#### Cleanup Old Data
```bash
# Clean up old audit logs (automated via trigger)
wrangler d1 execute capitao-caverna-images-prod --command "
  DELETE FROM SecurityAuditLog 
  WHERE timestamp < datetime('now', '-90 days')
"

# Clean up old sessions
wrangler d1 execute capitao-caverna-images-prod --command "
  DELETE FROM Sessions 
  WHERE expires_at < datetime('now')
"
```

#### Performance Optimization
```bash
# Analyze database performance
wrangler d1 execute capitao-caverna-images-prod --command "ANALYZE"

# Check index usage
wrangler d1 execute capitao-caverna-images-prod --command "
  EXPLAIN QUERY PLAN 
  SELECT * FROM GeneratedImages 
  WHERE user_id = 'test' AND status = 'COMPLETE'
"
```

### Storage Maintenance

#### R2 Bucket Cleanup
```bash
# List old temporary files
wrangler r2 object list capitao-caverna-images-prod --prefix temp/

# Clean up old temporary files (older than 7 days)
# This should be automated via lifecycle rules
```

## Security Operations

### Security Monitoring

#### Daily Security Checks
```bash
# Check for high-risk security events
curl -H "Authorization: Bearer <admin-token>" \
  "https://your-worker.workers.dev/api/v1/admin/security/audit?risk_level=high&limit=50"

# Review failed authentication attempts
curl -H "Authorization: Bearer <admin-token>" \
  "https://your-worker.workers.dev/api/v1/admin/security/audit?action=authentication&status=failure"
```

#### Security Incident Response
1. **Detection** - Automated alerts or manual discovery
2. **Assessment** - Determine severity and impact
3. **Containment** - Block malicious actors
4. **Investigation** - Analyze attack patterns
5. **Recovery** - Restore normal operations
6. **Lessons Learned** - Update security measures

### Access Control Management

#### User Role Management
- **Admin**: Full system access
- **Moderator**: Content moderation and user management
- **User**: Standard image generation access

#### API Key Rotation
```bash
# Rotate external service API keys
wrangler secret put MIDJOURNEY_API_KEY
wrangler secret put DALLE_API_KEY
wrangler secret put STABLE_DIFFUSION_API_KEY
```

## Performance Optimization

### Database Optimization
- Monitor query performance
- Optimize indexes based on usage patterns
- Consider read replicas for high-traffic queries
- Implement query caching where appropriate

### Storage Optimization
- Use appropriate R2 storage classes
- Implement CDN caching
- Optimize image formats and compression
- Monitor bandwidth usage

### Application Optimization
- Implement response caching
- Optimize external service calls
- Use connection pooling
- Monitor memory usage

## Disaster Recovery

### Backup Procedures

#### Database Backups
- D1 automatic backups (managed by Cloudflare)
- Export critical data regularly
- Test restore procedures

#### Storage Backups
- R2 cross-region replication
- Critical image backups
- Metadata export procedures

### Recovery Procedures

#### Service Recovery
1. Assess damage and scope
2. Restore from backups if needed
3. Verify data integrity
4. Test all functionality
5. Monitor for issues

#### Data Recovery
1. Identify affected data
2. Restore from most recent backup
3. Reconcile any data gaps
4. Validate restored data
5. Resume normal operations

### Business Continuity
- Maintain updated contact lists
- Document all procedures
- Regular disaster recovery testing
- Communication plans for users

## Contact Information

### Emergency Contacts
- **Primary On-Call**: [Contact Information]
- **Secondary On-Call**: [Contact Information]
- **Cloudflare Support**: [Support Information]

### Escalation Procedures
1. **Level 1**: On-call engineer
2. **Level 2**: Senior engineer/Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: External vendor support

---

**Document Version**: 1.0  
**Last Updated**: January 30, 2025  
**Next Review**: February 30, 2025