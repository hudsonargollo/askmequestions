/**
 * Security Manager for Capitão Caverna Image Engine
 * Handles authentication, authorization, rate limiting, and content safety
 */

export interface SecurityConfig {
  rateLimits: {
    perUser: {
      requests: number;
      window: number; // in seconds
    };
    perIP: {
      requests: number;
      window: number;
    };
    global: {
      requests: number;
      window: number;
    };
  };
  authentication: {
    sessionTimeout: number; // in seconds
    maxSessions: number;
    requireEmailVerification: boolean;
  };
  contentSafety: {
    enablePromptFiltering: boolean;
    enableImageModeration: boolean;
    blockedKeywords: string[];
  };
  audit: {
    logAllRequests: boolean;
    logFailedAttempts: boolean;
    retentionDays: number;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  action: string;
  resource: string;
  status: 'success' | 'failure' | 'blocked';
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ContentSafetyResult {
  safe: boolean;
  confidence: number;
  flags: string[];
  filteredContent?: string;
}

export class SecurityManager {
  private env: any;
  private config: SecurityConfig;

  constructor(env: any, config?: Partial<SecurityConfig>) {
    this.env = env;
    this.config = {
      rateLimits: {
        perUser: {
          requests: parseInt(env.RATE_LIMIT_PER_USER_PER_HOUR) || 50,
          window: 3600 // 1 hour
        },
        perIP: {
          requests: 100,
          window: 3600 // 1 hour
        },
        global: {
          requests: 1000,
          window: 60 // 1 minute
        }
      },
      authentication: {
        sessionTimeout: 24 * 60 * 60, // 24 hours
        maxSessions: 5,
        requireEmailVerification: true
      },
      contentSafety: {
        enablePromptFiltering: true,
        enableImageModeration: true,
        blockedKeywords: [
          'violence', 'weapon', 'drug', 'hate', 'explicit',
          'nude', 'sexual', 'inappropriate', 'offensive'
        ]
      },
      audit: {
        logAllRequests: true,
        logFailedAttempts: true,
        retentionDays: 90
      },
      ...config
    };
  }

  /**
   * Check rate limits for a user or IP address
   */
  async checkRateLimit(
    identifier: string, 
    type: 'user' | 'ip' | 'global'
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const config = this.config.rateLimits[type];
    const key = `rate_limit:${type}:${identifier}`;
    
    try {
      // Get current count from database
      const result = await this.env.IMAGE_DB.prepare(`
        SELECT COUNT(*) as count 
        FROM SecurityAuditLog 
        WHERE identifier = ? 
        AND timestamp > datetime('now', '-${config.window} seconds')
        AND action = 'image_generation_request'
      `).bind(identifier).first();

      const currentCount = result?.count || 0;
      const remaining = Math.max(0, config.requests - currentCount);
      const allowed = currentCount < config.requests;

      return {
        allowed,
        remaining,
        resetTime: now + config.window,
        retryAfter: allowed ? undefined : config.window
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if we can't check rate limit
      return {
        allowed: true,
        remaining: config.requests,
        resetTime: now + config.window
      };
    }
  }

  /**
   * Validate user authentication and authorization
   */
  async validateAuthentication(
    token: string,
    requiredRole?: string
  ): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      if (!token) {
        return { valid: false, error: 'No authentication token provided' };
      }

      // In a real implementation, you'd validate JWT token here
      // For now, we'll do a simple session lookup
      const session = await this.env.IMAGE_DB.prepare(`
        SELECT u.*, s.expires_at 
        FROM Users u 
        JOIN Sessions s ON u.user_id = s.user_id 
        WHERE s.session_token = ? 
        AND s.expires_at > datetime('now')
      `).bind(token).first();

      if (!session) {
        return { valid: false, error: 'Invalid or expired session' };
      }

      // Check role if required
      if (requiredRole && session.role !== requiredRole && session.role !== 'admin') {
        return { valid: false, error: 'Insufficient permissions' };
      }

      return { valid: true, user: session };
    } catch (error) {
      console.error('Authentication validation failed:', error);
      return { valid: false, error: 'Authentication system error' };
    }
  }

  /**
   * Filter and validate prompt content for safety
   */
  async validatePromptContent(prompt: string): Promise<ContentSafetyResult> {
    try {
      const lowerPrompt = prompt.toLowerCase();
      const flags: string[] = [];
      let confidence = 1.0;

      // Check for blocked keywords
      for (const keyword of this.config.contentSafety.blockedKeywords) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          flags.push(`blocked_keyword:${keyword}`);
          confidence = Math.min(confidence, 0.3);
        }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /\b(kill|murder|death|violence)\b/i,
        /\b(nude|naked|sexual|explicit)\b/i,
        /\b(drug|cocaine|heroin|marijuana)\b/i,
        /\b(hate|racist|nazi|terrorist)\b/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(prompt)) {
          flags.push(`suspicious_pattern:${pattern.source}`);
          confidence = Math.min(confidence, 0.2);
        }
      }

      // Check prompt length (very long prompts might be attempts to bypass filters)
      if (prompt.length > 2000) {
        flags.push('excessive_length');
        confidence = Math.min(confidence, 0.7);
      }

      const safe = flags.length === 0 || confidence > 0.5;

      return {
        safe,
        confidence,
        flags,
        filteredContent: safe ? prompt : this.filterPromptContent(prompt)
      };
    } catch (error) {
      console.error('Content safety check failed:', error);
      // Fail safe - block content if we can't validate it
      return {
        safe: false,
        confidence: 0,
        flags: ['validation_error'],
        filteredContent: 'Content validation failed'
      };
    }
  }

  /**
   * Filter inappropriate content from prompts
   */
  private filterPromptContent(prompt: string): string {
    let filtered = prompt;

    // Replace blocked keywords with safe alternatives
    const replacements: Record<string, string> = {
      'violence': 'action',
      'weapon': 'tool',
      'drug': 'medicine',
      'hate': 'dislike',
      'explicit': 'detailed',
      'nude': 'unclothed',
      'sexual': 'romantic',
      'inappropriate': 'unusual',
      'offensive': 'strong'
    };

    for (const [blocked, replacement] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${blocked}\\b`, 'gi');
      filtered = filtered.replace(regex, replacement);
    }

    return filtered;
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditLog: SecurityAuditLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...event
      };

      await this.env.IMAGE_DB.prepare(`
        INSERT INTO SecurityAuditLog (
          id, timestamp, user_id, ip_address, user_agent, 
          action, resource, status, details, risk_level, identifier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        auditLog.id,
        auditLog.timestamp,
        auditLog.userId || null,
        auditLog.ipAddress,
        auditLog.userAgent,
        auditLog.action,
        auditLog.resource,
        auditLog.status,
        JSON.stringify(auditLog.details),
        auditLog.riskLevel,
        auditLog.userId || auditLog.ipAddress
      ).run();
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Detect and prevent abuse patterns
   */
  async detectAbusePatterns(
    userId: string, 
    ipAddress: string
  ): Promise<{ isAbuse: boolean; reason?: string; action?: string }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check for rapid-fire requests
      const recentRequests = await this.env.IMAGE_DB.prepare(`
        SELECT COUNT(*) as count 
        FROM SecurityAuditLog 
        WHERE (user_id = ? OR ip_address = ?) 
        AND timestamp > ? 
        AND action = 'image_generation_request'
      `).bind(userId, ipAddress, oneHourAgo.toISOString()).first();

      if (recentRequests?.count > 20) {
        return {
          isAbuse: true,
          reason: 'Excessive requests in short time period',
          action: 'temporary_block'
        };
      }

      // Check for failed authentication attempts
      const failedAttempts = await this.env.IMAGE_DB.prepare(`
        SELECT COUNT(*) as count 
        FROM SecurityAuditLog 
        WHERE ip_address = ? 
        AND timestamp > ? 
        AND action = 'authentication' 
        AND status = 'failure'
      `).bind(ipAddress, oneHourAgo.toISOString()).first();

      if (failedAttempts?.count > 10) {
        return {
          isAbuse: true,
          reason: 'Multiple failed authentication attempts',
          action: 'ip_block'
        };
      }

      // Check for content safety violations
      const safetyViolations = await this.env.IMAGE_DB.prepare(`
        SELECT COUNT(*) as count 
        FROM SecurityAuditLog 
        WHERE (user_id = ? OR ip_address = ?) 
        AND timestamp > ? 
        AND action = 'content_safety_violation'
      `).bind(userId, ipAddress, oneDayAgo.toISOString()).first();

      if (safetyViolations?.count > 5) {
        return {
          isAbuse: true,
          reason: 'Multiple content safety violations',
          action: 'account_review'
        };
      }

      return { isAbuse: false };
    } catch (error) {
      console.error('Abuse detection failed:', error);
      return { isAbuse: false };
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupAuditLogs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.audit.retentionDays);

      await this.env.IMAGE_DB.prepare(`
        DELETE FROM SecurityAuditLog 
        WHERE timestamp < ?
      `).bind(cutoffDate.toISOString()).run();

      console.log(`Cleaned up audit logs older than ${this.config.audit.retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
    }
  }

  /**
   * Generate security report for monitoring
   */
  async generateSecurityReport(): Promise<{
    summary: {
      totalRequests: number;
      blockedRequests: number;
      failedAuthentications: number;
      contentViolations: number;
    };
    topRisks: Array<{
      type: string;
      count: number;
      description: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Get summary statistics
      const summary = await this.env.IMAGE_DB.prepare(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_requests,
          COUNT(CASE WHEN action = 'authentication' AND status = 'failure' THEN 1 END) as failed_authentications,
          COUNT(CASE WHEN action = 'content_safety_violation' THEN 1 END) as content_violations
        FROM SecurityAuditLog 
        WHERE timestamp > ?
      `).bind(oneDayAgo.toISOString()).first();

      // Get top risk patterns
      const risks = await this.env.IMAGE_DB.prepare(`
        SELECT 
          action,
          COUNT(*) as count,
          risk_level
        FROM SecurityAuditLog 
        WHERE timestamp > ? 
        AND status IN ('failure', 'blocked')
        GROUP BY action, risk_level
        ORDER BY count DESC
        LIMIT 10
      `).bind(oneDayAgo.toISOString()).all();

      const topRisks = risks.results?.map((risk: any) => ({
        type: risk.action,
        count: risk.count,
        description: `${risk.action} (${risk.risk_level} risk): ${risk.count} incidents`
      })) || [];

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (summary?.blocked_requests > 10) {
        recommendations.push('Consider reviewing rate limiting policies - high number of blocked requests');
      }
      
      if (summary?.failed_authentications > 20) {
        recommendations.push('Implement CAPTCHA or additional authentication measures');
      }
      
      if (summary?.content_violations > 5) {
        recommendations.push('Review and strengthen content safety filters');
      }

      return {
        summary: {
          totalRequests: summary?.total_requests || 0,
          blockedRequests: summary?.blocked_requests || 0,
          failedAuthentications: summary?.failed_authentications || 0,
          contentViolations: summary?.content_violations || 0
        },
        topRisks,
        recommendations
      };
    } catch (error) {
      console.error('Failed to generate security report:', error);
      return {
        summary: {
          totalRequests: 0,
          blockedRequests: 0,
          failedAuthentications: 0,
          contentViolations: 0
        },
        topRisks: [],
        recommendations: ['Security reporting system needs attention']
      };
    }
  }
}

/**
 * Security middleware for Hono
 */
export function createSecurityMiddleware(env: any) {
  const securityManager = new SecurityManager(env);

  return async (c: any, next: any) => {
    const startTime = Date.now();
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';
    const userId = c.get('user')?.user_id;

    try {
      // Check rate limits
      const userRateLimit = userId ? await securityManager.checkRateLimit(userId, 'user') : null;
      const ipRateLimit = await securityManager.checkRateLimit(ipAddress, 'ip');
      const globalRateLimit = await securityManager.checkRateLimit('global', 'global');

      if (!userRateLimit?.allowed || !ipRateLimit.allowed || !globalRateLimit.allowed) {
        await securityManager.logSecurityEvent({
          userId,
          ipAddress,
          userAgent,
          action: 'rate_limit_exceeded',
          resource: c.req.path,
          status: 'blocked',
          details: { userRateLimit, ipRateLimit, globalRateLimit },
          riskLevel: 'medium'
        });

        return c.json({ 
          error: 'Rate limit exceeded',
          retryAfter: Math.max(
            userRateLimit?.retryAfter || 0,
            ipRateLimit.retryAfter || 0,
            globalRateLimit.retryAfter || 0
          )
        }, 429);
      }

      // Check for abuse patterns
      if (userId) {
        const abuseCheck = await securityManager.detectAbusePatterns(userId, ipAddress);
        if (abuseCheck.isAbuse) {
          await securityManager.logSecurityEvent({
            userId,
            ipAddress,
            userAgent,
            action: 'abuse_detected',
            resource: c.req.path,
            status: 'blocked',
            details: abuseCheck,
            riskLevel: 'high'
          });

          return c.json({ 
            error: 'Access denied due to abuse detection',
            reason: abuseCheck.reason
          }, 403);
        }
      }

      // Add security headers
      c.header('X-Content-Type-Options', 'nosniff');
      c.header('X-Frame-Options', 'DENY');
      c.header('X-XSS-Protection', '1; mode=block');
      c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      c.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");

      await next();

      // Log successful request
      await securityManager.logSecurityEvent({
        userId,
        ipAddress,
        userAgent,
        action: 'request',
        resource: c.req.path,
        status: 'success',
        details: { 
          method: c.req.method,
          responseTime: Date.now() - startTime
        },
        riskLevel: 'low'
      });

    } catch (error) {
      console.error('Security middleware error:', error);
      
      await securityManager.logSecurityEvent({
        userId,
        ipAddress,
        userAgent,
        action: 'security_error',
        resource: c.req.path,
        status: 'failure',
        details: { error: String(error) },
        riskLevel: 'high'
      });

      // Don't block request on security middleware errors
      await next();
    }
  };
}