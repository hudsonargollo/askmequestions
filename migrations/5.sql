-- Migration 5: Security and Audit System
-- Add security audit logging and user management tables

-- Security Audit Log table for comprehensive logging
CREATE TABLE IF NOT EXISTS SecurityAuditLog (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'blocked')),
    details TEXT, -- JSON string with additional details
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    identifier TEXT NOT NULL -- For rate limiting (user_id or ip_address)
);

-- Sessions table for secure session management
CREATE TABLE IF NOT EXISTS Sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Users table (if not exists from previous migrations)
CREATE TABLE IF NOT EXISTS Users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP
);

-- Rate limiting tracking table
CREATE TABLE IF NOT EXISTS RateLimitTracking (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL, -- user_id or ip_address
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('user', 'ip', 'global')),
    action TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_start TIMESTAMP NOT NULL,
    request_count INTEGER DEFAULT 1
);

-- Content safety violations table
CREATE TABLE IF NOT EXISTS ContentSafetyViolations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    ip_address TEXT NOT NULL,
    prompt_content TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    confidence_score REAL,
    flags TEXT, -- JSON array of flags
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_taken TEXT, -- 'blocked', 'filtered', 'flagged'
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON SecurityAuditLog(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON SecurityAuditLog(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_ip_address ON SecurityAuditLog(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON SecurityAuditLog(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_status ON SecurityAuditLog(status);
CREATE INDEX IF NOT EXISTS idx_security_audit_identifier ON SecurityAuditLog(identifier);
CREATE INDEX IF NOT EXISTS idx_security_audit_risk_level ON SecurityAuditLog(risk_level);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON Sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON Sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON Sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON Sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON Users(is_active);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON RateLimitTracking(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_timestamp ON RateLimitTracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON RateLimitTracking(window_start);

CREATE INDEX IF NOT EXISTS idx_content_safety_user_id ON ContentSafetyViolations(user_id);
CREATE INDEX IF NOT EXISTS idx_content_safety_timestamp ON ContentSafetyViolations(timestamp);
CREATE INDEX IF NOT EXISTS idx_content_safety_violation_type ON ContentSafetyViolations(violation_type);

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON Users
    BEGIN
        UPDATE Users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END;

-- Clean up expired sessions trigger
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
    AFTER INSERT ON Sessions
    BEGIN
        DELETE FROM Sessions WHERE expires_at < datetime('now');
    END;