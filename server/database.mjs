import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createPasswordHash(password, salt = randomBytes(16)) {
  const derived = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function verifyPassword(password, storedHash) {
  const [algorithm, saltValue, expectedValue] = String(storedHash || "").split("$");
  if (algorithm !== "scrypt" || !saltValue || !expectedValue) return false;
  try {
    const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), 32);
    const expected = Buffer.from(expectedValue, "base64url");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("base64url");
}

function hashRelationshipInviteCode(code) {
  return createHash("sha256").update(String(code || "").trim().toUpperCase()).digest("base64url");
}

function validDisplayName(displayName) {
  const value = String(displayName || "").trim();
  return value.length >= 1 && value.length <= 48 && !/[\u0000-\u001F\u007F]/.test(value) ? value : null;
}

function validNewPassword(password) {
  const value = String(password || "");
  if (value.length < 12 || value.length > 128) return null;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return null;
  return value;
}

function validLoginName(loginName) {
  const value = String(loginName || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._@+-]{2,95}$/.test(value) ? value : null;
}

const SELF_REGISTERABLE_ROLES = new Set(["parent", "teacher"]);
const RELATIONSHIP_INVITABLE_ROLES = new Set(["parent", "teacher"]);
const RELATIONSHIP_CREATOR_ROLES = new Set(["student", "parent", "teacher"]);
const MANAGED_STUDENT_GRADES = new Set([
  "小学一年级",
  "小学二年级",
  "小学三年级",
  "小学四年级",
  "小学五年级",
  "小学六年级",
]);

function validStudentGradeLabel(gradeLabel) {
  const value = String(gradeLabel || "").trim();
  return MANAGED_STUDENT_GRADES.has(value) ? value : null;
}

const LOCAL_DEMO_ACCOUNTS = [
  {
    userId: "user-student-001",
    loginName: "lin.an",
    displayName: "林安",
    role: "student",
    studentId: "student-001",
    localPassword: "student-demo-2026",
  },
  {
    userId: "user-parent-001",
    loginName: "parent.lin",
    displayName: "林安妈妈",
    role: "parent",
    studentId: "student-001",
    localPassword: "parent-demo-2026",
  },
  {
    userId: "user-teacher-001",
    loginName: "teacher.wang",
    displayName: "王老师",
    role: "teacher",
    studentId: "student-001",
    localPassword: "teacher-demo-2026",
  },
];

const LOCAL_DEMO_STUDENT_ACCESS = [
  { actorUserId: "user-student-001", studentId: "student-001", relationshipType: "self" },
  { actorUserId: "user-parent-001", studentId: "student-001", relationshipType: "guardian" },
  { actorUserId: "user-teacher-001", studentId: "student-001", relationshipType: "teacher" },
];

const LOCAL_DEMO_STUDENTS = [
  {
    studentId: "student-001",
    displayName: "林安",
    gradeLabel: "小学五年级",
    profile: {
      currentSubjectIds: ["math-linear-equations"],
      profileStatus: "active",
    },
  },
];

export function createEducationDatabase(databasePath, { seedDemoAccounts = true } = {}) {
  if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);

  database.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS student_plans (
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (student_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS behavior_events (
      event_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      event_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS behavior_events_by_student_time
      ON behavior_events (student_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS assessment_sessions (
      session_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      assessment_type TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      session_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS assessment_sessions_by_student_subject
      ON assessment_sessions (student_id, subject_id, assessment_type, updated_at DESC);

    CREATE TABLE IF NOT EXISTS daily_practice_sessions (
      session_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      practice_date TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      session_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS daily_practice_sessions_by_student_date
      ON daily_practice_sessions (student_id, subject_id, practice_date, updated_at DESC);

    CREATE TABLE IF NOT EXISTS daily_practice_plans (
      plan_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      practice_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      UNIQUE (student_id, subject_id, practice_date)
    );

    CREATE INDEX IF NOT EXISTS daily_practice_plans_by_student_date
      ON daily_practice_plans (student_id, subject_id, practice_date, updated_at DESC);

    CREATE TABLE IF NOT EXISTS daily_practice_runs (
      run_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      practice_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      run_json TEXT NOT NULL,
      UNIQUE (student_id, subject_id, practice_date)
    );

    CREATE INDEX IF NOT EXISTS daily_practice_runs_by_student_date
      ON daily_practice_runs (student_id, subject_id, practice_date, updated_at DESC);

    CREATE TABLE IF NOT EXISTS question_deliveries (
      delivery_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      delivery_mode TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      delivery_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS question_deliveries_by_student_time
      ON question_deliveries (student_id, subject_id, delivery_mode, updated_at DESC);

    CREATE TABLE IF NOT EXISTS observer_workspaces (
      actor_user_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (actor_user_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS student_messages (
      message_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      message_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS student_messages_by_student_time
      ON student_messages (student_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS student_preferences (
      student_id TEXT PRIMARY KEY,
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_onboarding_prefills (
      student_id TEXT PRIMARY KEY,
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_learning_goal_drafts (
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (student_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS user_accounts (
      user_id TEXT PRIMARY KEY,
      login_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      student_id TEXT,
      account_status TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      session_id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS auth_sessions_by_token
      ON auth_sessions (token_hash);

    CREATE TABLE IF NOT EXISTS account_audit_events (
      event_id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      target_user_id TEXT,
      target_student_id TEXT,
      action_type TEXT NOT NULL,
      event_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS account_audit_events_by_actor_time
      ON account_audit_events (actor_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS student_access_links (
      actor_user_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      access_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (actor_user_id, student_id)
    );

    CREATE INDEX IF NOT EXISTS student_access_links_by_student
      ON student_access_links (student_id, actor_user_id);

    CREATE TABLE IF NOT EXISTS student_relationship_invites (
      invite_id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      student_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      target_role TEXT NOT NULL,
      invite_status TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      accepted_by_user_id TEXT,
      created_at TEXT NOT NULL,
      accepted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS student_relationship_invites_by_student
      ON student_relationship_invites (student_id, invite_status, expires_at DESC);

    CREATE TABLE IF NOT EXISTS student_profiles (
      student_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      grade_label TEXT,
      profile_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const statements = {
    getPlan: database.prepare(
      "SELECT record_json FROM student_plans WHERE student_id = ? AND subject_id = ? LIMIT 1",
    ),
    listPlansBySubject: database.prepare(`
      SELECT record_json FROM student_plans
      WHERE subject_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `),
    upsertPlan: database.prepare(`
      INSERT INTO student_plans (student_id, subject_id, record_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, subject_id) DO UPDATE SET
        record_json = excluded.record_json,
        updated_at = excluded.updated_at
    `),
    insertEvent: database.prepare(`
      INSERT INTO behavior_events (event_id, student_id, event_type, timestamp, event_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO NOTHING
    `),
    listEvents: database.prepare(`
      SELECT event_json FROM behavior_events
      WHERE student_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `),
    upsertAssessmentSession: database.prepare(`
      INSERT INTO assessment_sessions (session_id, student_id, subject_id, assessment_type, updated_at, session_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        updated_at = excluded.updated_at,
        session_json = excluded.session_json
    `),
    getLatestAssessmentSession: database.prepare(`
      SELECT session_json FROM assessment_sessions
      WHERE student_id = ? AND subject_id = ? AND assessment_type = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `),
    getAssessmentSessionById: database.prepare(
      "SELECT session_json FROM assessment_sessions WHERE session_id = ? LIMIT 1",
    ),
    getDailyPracticeSession: database.prepare(`
      SELECT session_json FROM daily_practice_sessions
      WHERE student_id = ? AND subject_id = ? AND practice_date = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `),
    listDailyPracticeSessions: database.prepare(`
      SELECT session_json FROM daily_practice_sessions
      WHERE student_id = ? AND subject_id = ?
      ORDER BY practice_date DESC, updated_at DESC
      LIMIT ?
    `),
    upsertDailyPracticeSession: database.prepare(`
      INSERT INTO daily_practice_sessions (session_id, student_id, subject_id, practice_date, updated_at, session_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        updated_at = excluded.updated_at,
        session_json = excluded.session_json
    `),
    getDailyPracticePlan: database.prepare(`
      SELECT plan_json FROM daily_practice_plans
      WHERE student_id = ? AND subject_id = ? AND practice_date = ?
      LIMIT 1
    `),
    getLatestDailyPracticePlan: database.prepare(`
      SELECT plan_json FROM daily_practice_plans
      WHERE student_id = ? AND subject_id = ?
      ORDER BY practice_date DESC, updated_at DESC
      LIMIT 1
    `),
    upsertDailyPracticePlan: database.prepare(`
      INSERT INTO daily_practice_plans (plan_id, student_id, subject_id, practice_date, created_at, updated_at, plan_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, subject_id, practice_date) DO UPDATE SET
        plan_id = excluded.plan_id,
        updated_at = excluded.updated_at,
        plan_json = excluded.plan_json
    `),
    getDailyPracticeRun: database.prepare(`
      SELECT run_json FROM daily_practice_runs
      WHERE student_id = ? AND subject_id = ? AND practice_date = ?
      LIMIT 1
    `),
    getDailyPracticeRunById: database.prepare(
      "SELECT run_json FROM daily_practice_runs WHERE run_id = ? LIMIT 1",
    ),
    upsertDailyPracticeRun: database.prepare(`
      INSERT INTO daily_practice_runs (run_id, student_id, subject_id, practice_date, created_at, updated_at, run_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, subject_id, practice_date) DO UPDATE SET
        run_id = excluded.run_id,
        updated_at = excluded.updated_at,
        run_json = excluded.run_json
    `),
    getQuestionDelivery: database.prepare(
      "SELECT delivery_json FROM question_deliveries WHERE delivery_id = ? LIMIT 1",
    ),
    listQuestionDeliveries: database.prepare(`
      SELECT delivery_json FROM question_deliveries
      WHERE student_id = ? AND subject_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `),
    upsertQuestionDelivery: database.prepare(`
      INSERT INTO question_deliveries (delivery_id, student_id, subject_id, delivery_mode, delivery_status, created_at, updated_at, delivery_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(delivery_id) DO UPDATE SET
        delivery_status = excluded.delivery_status,
        updated_at = excluded.updated_at,
        delivery_json = excluded.delivery_json
    `),
    getObserverWorkspace: database.prepare(
      "SELECT record_json FROM observer_workspaces WHERE actor_user_id = ? AND student_id = ? LIMIT 1",
    ),
    upsertObserverWorkspace: database.prepare(`
      INSERT INTO observer_workspaces (actor_user_id, student_id, record_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(actor_user_id, student_id) DO UPDATE SET
        record_json = excluded.record_json,
        updated_at = excluded.updated_at
    `),
    listStudentMessages: database.prepare(`
      SELECT message_json FROM student_messages
      WHERE student_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `),
    insertStudentMessage: database.prepare(`
      INSERT INTO student_messages (message_id, student_id, created_at, message_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(message_id) DO UPDATE SET
        message_json = excluded.message_json
    `),
    getStudentPreferences: database.prepare(
      "SELECT record_json FROM student_preferences WHERE student_id = ? LIMIT 1",
    ),
    upsertStudentPreferences: database.prepare(`
      INSERT INTO student_preferences (student_id, record_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        record_json = excluded.record_json,
        updated_at = excluded.updated_at
    `),
    getStudentOnboardingPrefill: database.prepare(
      "SELECT record_json FROM student_onboarding_prefills WHERE student_id = ? LIMIT 1",
    ),
    upsertStudentOnboardingPrefill: database.prepare(`
      INSERT INTO student_onboarding_prefills (student_id, record_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        record_json = excluded.record_json,
        updated_at = excluded.updated_at
    `),
    getStudentLearningGoalDraft: database.prepare(
      "SELECT record_json FROM student_learning_goal_drafts WHERE student_id = ? AND subject_id = ? LIMIT 1",
    ),
    upsertStudentLearningGoalDraft: database.prepare(`
      INSERT INTO student_learning_goal_drafts (student_id, subject_id, record_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, subject_id) DO UPDATE SET
        record_json = excluded.record_json,
        updated_at = excluded.updated_at
    `),
    findAccountByLogin: database.prepare(
      "SELECT * FROM user_accounts WHERE login_name = ? AND account_status = 'active' LIMIT 1",
    ),
    findAccountByLoginAny: database.prepare("SELECT * FROM user_accounts WHERE login_name = ? LIMIT 1"),
    getAccountById: database.prepare("SELECT * FROM user_accounts WHERE user_id = ? LIMIT 1"),
    seedAccount: database.prepare(`
      INSERT INTO user_accounts (user_id, login_name, display_name, role, student_id, account_status, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
      ON CONFLICT(user_id) DO NOTHING
    `),
    insertAccount: database.prepare(`
      INSERT INTO user_accounts (user_id, login_name, display_name, role, student_id, account_status, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `),
    insertAuthSession: database.prepare(`
      INSERT INTO auth_sessions (session_id, token_hash, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    findAuthSession: database.prepare(`
      SELECT auth_sessions.session_id, auth_sessions.expires_at, user_accounts.*
      FROM auth_sessions
      JOIN user_accounts ON user_accounts.user_id = auth_sessions.user_id
      WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ? AND user_accounts.account_status = 'active'
      LIMIT 1
    `),
    deleteAuthSessionByToken: database.prepare("DELETE FROM auth_sessions WHERE token_hash = ?"),
    deleteOtherAuthSessionsForUser: database.prepare("DELETE FROM auth_sessions WHERE user_id = ? AND token_hash != ?"),
    deleteExpiredAuthSessions: database.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?"),
    updateAccountDisplayName: database.prepare(`
      UPDATE user_accounts
      SET display_name = ?, updated_at = ?
      WHERE user_id = ? AND account_status = 'active'
    `),
    updateAccountPassword: database.prepare(`
      UPDATE user_accounts
      SET password_hash = ?, updated_at = ?
      WHERE user_id = ? AND account_status = 'active'
    `),
    insertAccountAuditEvent: database.prepare(`
      INSERT INTO account_audit_events (
        event_id, actor_user_id, actor_role, target_user_id, target_student_id, action_type, event_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    listAccountAuditEvents: database.prepare(`
      SELECT actor_user_id, actor_role, target_user_id, target_student_id, action_type, event_json, created_at
      FROM account_audit_events
      WHERE actor_user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `),
    findStudentAccessLink: database.prepare(`
      SELECT 1 FROM student_access_links
      WHERE actor_user_id = ? AND student_id = ? AND access_status = 'active'
      LIMIT 1
    `),
    getActiveStudentAccessLink: database.prepare(`
      SELECT actor_user_id, student_id, relationship_type, access_status, created_at
      FROM student_access_links
      WHERE actor_user_id = ? AND student_id = ? AND access_status = 'active'
      LIMIT 1
    `),
    listStudentAccessLinks: database.prepare(`
      SELECT links.student_id, links.relationship_type, profiles.display_name, profiles.grade_label
      FROM student_access_links AS links
      LEFT JOIN student_profiles AS profiles ON profiles.student_id = links.student_id
      WHERE links.actor_user_id = ? AND links.access_status = 'active'
      ORDER BY links.created_at ASC
    `),
    seedStudentAccessLink: database.prepare(`
      INSERT INTO student_access_links (actor_user_id, student_id, relationship_type, access_status, created_at)
      VALUES (?, ?, ?, 'active', ?)
      ON CONFLICT(actor_user_id, student_id) DO NOTHING
    `),
    insertStudentAccessLink: database.prepare(`
      INSERT INTO student_access_links (actor_user_id, student_id, relationship_type, access_status, created_at)
      VALUES (?, ?, ?, 'active', ?)
      ON CONFLICT(actor_user_id, student_id) DO UPDATE SET
        relationship_type = excluded.relationship_type,
        access_status = 'active',
        created_at = excluded.created_at
    `),
    revokeStudentAccessLink: database.prepare(`
      UPDATE student_access_links
      SET access_status = 'revoked'
      WHERE actor_user_id = ? AND student_id = ? AND access_status = 'active'
    `),
    insertStudentRelationshipInvite: database.prepare(`
      INSERT INTO student_relationship_invites (
        invite_id, code_hash, student_id, created_by_user_id, target_role, invite_status, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `),
    findStudentRelationshipInviteByCodeHash: database.prepare(
      "SELECT * FROM student_relationship_invites WHERE code_hash = ? LIMIT 1",
    ),
    acceptStudentRelationshipInvite: database.prepare(`
      UPDATE student_relationship_invites
      SET invite_status = 'accepted', accepted_by_user_id = ?, accepted_at = ?
      WHERE invite_id = ? AND invite_status = 'active' AND expires_at > ?
    `),
    getStudentProfile: database.prepare(
      "SELECT student_id, display_name, grade_label, profile_json FROM student_profiles WHERE student_id = ? LIMIT 1",
    ),
    seedStudentProfile: database.prepare(`
      INSERT INTO student_profiles (student_id, display_name, grade_label, profile_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(student_id) DO NOTHING
    `),
    insertStudentProfile: database.prepare(`
      INSERT INTO student_profiles (student_id, display_name, grade_label, profile_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `),
  };

  const createdAt = new Date().toISOString();
  if (seedDemoAccounts) {
    LOCAL_DEMO_ACCOUNTS.forEach((account) => {
      statements.seedAccount.run(
        account.userId,
        account.loginName,
        account.displayName,
        account.role,
        account.studentId,
        createPasswordHash(account.localPassword),
        createdAt,
        createdAt,
      );
    });
    LOCAL_DEMO_STUDENT_ACCESS.forEach((link) => {
      statements.seedStudentAccessLink.run(link.actorUserId, link.studentId, link.relationshipType, createdAt);
    });
    LOCAL_DEMO_STUDENTS.forEach((student) => {
      statements.seedStudentProfile.run(
        student.studentId,
        student.displayName,
        student.gradeLabel,
        JSON.stringify(student.profile),
        createdAt,
      );
    });
  }

  function toPublicAccount(row) {
    if (!row) return null;
    return {
      userId: row.user_id,
      loginName: row.login_name,
      displayName: row.display_name,
      role: row.role,
      studentId: row.student_id || null,
      accountStatus: row.account_status,
    };
  }

  function saveAccountAuditEvent({ actorUserId, actorRole, targetUserId = null, targetStudentId = null, actionType, detail = {} }) {
    const createdAt = new Date().toISOString();
    statements.insertAccountAuditEvent.run(
      `audit-${randomBytes(12).toString("base64url")}`,
      actorUserId,
      actorRole,
      targetUserId,
      targetStudentId,
      actionType,
      JSON.stringify(detail),
      createdAt,
    );
  }

  function relationshipTypeForRole(role) {
    if (role === "parent") return "guardian";
    if (role === "teacher") return "teacher";
    return "administrator";
  }

  return {
    close() {
      database.close();
    },
    getLatestAssessmentSession({ studentId, subjectId, assessmentType }) {
      const row = statements.getLatestAssessmentSession.get(studentId, subjectId, assessmentType);
      return row ? parseJson(row.session_json) : null;
    },
    getAssessmentSessionById({ sessionId }) {
      const row = statements.getAssessmentSessionById.get(sessionId);
      return row ? parseJson(row.session_json) : null;
    },
    getPlan({ studentId, subjectId }) {
      const row = statements.getPlan.get(studentId, subjectId);
      return row ? parseJson(row.record_json) : null;
    },
    listPlansBySubject({ subjectId, limit = 500 }) {
      if (!subjectId) return [];
      return statements.listPlansBySubject
        .all(subjectId, Math.min(Math.max(Number(limit) || 500, 1), 2000))
        .map((row) => parseJson(row.record_json))
        .filter(Boolean);
    },
    getDailyPracticeSession({ studentId, subjectId, practiceDate }) {
      const row = statements.getDailyPracticeSession.get(studentId, subjectId, practiceDate);
      return row ? parseJson(row.session_json) : null;
    },
    getDailyPracticePlan({ studentId, subjectId, practiceDate }) {
      const row = statements.getDailyPracticePlan.get(studentId, subjectId, practiceDate);
      return row ? parseJson(row.plan_json) : null;
    },
    getLatestDailyPracticePlan({ studentId, subjectId }) {
      const row = statements.getLatestDailyPracticePlan.get(studentId, subjectId);
      return row ? parseJson(row.plan_json) : null;
    },
    getQuestionDelivery({ deliveryId }) {
      const row = statements.getQuestionDelivery.get(deliveryId);
      return row ? parseJson(row.delivery_json) : null;
    },
    listQuestionDeliveries({ studentId, subjectId, limit = 200 }) {
      return statements.listQuestionDeliveries
        .all(studentId, subjectId, Math.min(Math.max(Number(limit) || 200, 1), 1000))
        .map((row) => parseJson(row.delivery_json))
        .filter(Boolean);
    },
    listDailyPracticeSessions({ studentId, subjectId, limit = 30 }) {
      return statements.listDailyPracticeSessions
        .all(studentId, subjectId, Math.min(Math.max(Number(limit) || 30, 1), 90))
        .map((row) => parseJson(row.session_json))
        .filter(Boolean);
    },
    getObserverWorkspace({ actorUserId, studentId }) {
      const row = statements.getObserverWorkspace.get(actorUserId, studentId);
      return row ? parseJson(row.record_json) : null;
    },
    getStudentPreferences({ studentId }) {
      const row = statements.getStudentPreferences.get(studentId);
      return row ? parseJson(row.record_json) : null;
    },
    getStudentOnboardingPrefill({ studentId }) {
      const row = statements.getStudentOnboardingPrefill.get(studentId);
      return row ? parseJson(row.record_json) : null;
    },
    getStudentLearningGoalDraft({ studentId, subjectId }) {
      const row = statements.getStudentLearningGoalDraft.get(studentId, subjectId);
      return row ? parseJson(row.record_json) : null;
    },
    authenticateAccount({ loginName, password }) {
      const account = statements.findAccountByLogin.get(String(loginName || "").trim().toLowerCase());
      if (!account || !verifyPassword(String(password || ""), account.password_hash)) return null;
      return toPublicAccount(account);
    },
    createObserverAccount({ loginName, displayName, password, role }) {
      const normalizedLoginName = validLoginName(loginName);
      const normalizedDisplayName = validDisplayName(displayName);
      const normalizedPassword = validNewPassword(password);
      if (!normalizedLoginName) return { error: "invalid_login_name" };
      if (!normalizedDisplayName) return { error: "invalid_display_name" };
      if (!normalizedPassword) return { error: "password_policy_not_met" };
      if (!SELF_REGISTERABLE_ROLES.has(role)) return { error: "invalid_account_role" };
      if (statements.findAccountByLoginAny.get(normalizedLoginName)) return { error: "login_name_taken" };

      const userId = `user-${role}-${randomBytes(12).toString("base64url")}`;
      const createdAt = new Date().toISOString();
      try {
        database.exec("BEGIN IMMEDIATE");
        statements.insertAccount.run(
          userId,
          normalizedLoginName,
          normalizedDisplayName,
          role,
          null,
          createPasswordHash(normalizedPassword),
          createdAt,
          createdAt,
        );
        saveAccountAuditEvent({
          actorUserId: userId,
          actorRole: role,
          targetUserId: userId,
          actionType: "account_registered",
          detail: { registration: "self_service" },
        });
        database.exec("COMMIT");
      } catch (error) {
        try {
          database.exec("ROLLBACK");
        } catch {
          // The transaction may already have been closed by SQLite after a failed statement.
        }
        if (String(error?.message || "").includes("user_accounts.login_name")) return { error: "login_name_taken" };
        return { error: "account_creation_failed" };
      }
      return { user: toPublicAccount(statements.getAccountById.get(userId)) };
    },
    createSelfRegisteredStudentAccount({ loginName, displayName, password, gradeLabel }) {
      const normalizedLoginName = validLoginName(loginName);
      const normalizedDisplayName = validDisplayName(displayName);
      const normalizedPassword = validNewPassword(password);
      const normalizedGradeLabel = validStudentGradeLabel(gradeLabel);
      if (!normalizedLoginName) return { error: "invalid_login_name" };
      if (!normalizedDisplayName) return { error: "invalid_display_name" };
      if (!normalizedPassword) return { error: "password_policy_not_met" };
      if (!normalizedGradeLabel) return { error: "invalid_student_grade" };
      if (statements.findAccountByLoginAny.get(normalizedLoginName)) return { error: "login_name_taken" };

      const userId = `user-student-${randomBytes(12).toString("base64url")}`;
      const studentId = `student-${randomBytes(12).toString("base64url")}`;
      const createdAt = new Date().toISOString();
      const profile = {
        currentSubjectIds: ["math-linear-equations"],
        profileStatus: "active",
        createdByRole: "student",
        registrationMode: "self_service",
      };

      try {
        database.exec("BEGIN IMMEDIATE");
        statements.insertAccount.run(
          userId,
          normalizedLoginName,
          normalizedDisplayName,
          "student",
          studentId,
          createPasswordHash(normalizedPassword),
          createdAt,
          createdAt,
        );
        statements.insertStudentProfile.run(
          studentId,
          normalizedDisplayName,
          normalizedGradeLabel,
          JSON.stringify(profile),
          createdAt,
        );
        statements.insertStudentAccessLink.run(userId, studentId, "self", createdAt);
        saveAccountAuditEvent({
          actorUserId: userId,
          actorRole: "student",
          targetUserId: userId,
          targetStudentId: studentId,
          actionType: "student_account_registered",
          detail: { gradeLabel: normalizedGradeLabel, registration: "self_service" },
        });
        database.exec("COMMIT");
      } catch (error) {
        try {
          database.exec("ROLLBACK");
        } catch {
          // The transaction may already have been closed by SQLite after a failed statement.
        }
        if (String(error?.message || "").includes("user_accounts.login_name")) return { error: "login_name_taken" };
        return { error: "student_account_creation_failed" };
      }

      return {
        user: toPublicAccount(statements.getAccountById.get(userId)),
        student: {
          studentId,
          displayName: normalizedDisplayName,
          gradeLabel: normalizedGradeLabel,
          relationshipType: "self",
        },
      };
    },
    createManagedStudentAccount({ actorUserId, actorRole, loginName, displayName, password, gradeLabel }) {
      const actor = statements.getAccountById.get(actorUserId);
      const normalizedLoginName = validLoginName(loginName);
      const normalizedDisplayName = validDisplayName(displayName);
      const normalizedPassword = validNewPassword(password);
      const normalizedGradeLabel = validStudentGradeLabel(gradeLabel);
      if (!actor || actor.account_status !== "active" || actor.role !== actorRole) return { error: "account_not_found" };
      if (!SELF_REGISTERABLE_ROLES.has(actorRole) && actorRole !== "admin") return { error: "account_role_not_allowed" };
      if (!normalizedLoginName) return { error: "invalid_login_name" };
      if (!normalizedDisplayName) return { error: "invalid_display_name" };
      if (!normalizedPassword) return { error: "password_policy_not_met" };
      if (!normalizedGradeLabel) return { error: "invalid_student_grade" };
      if (statements.findAccountByLoginAny.get(normalizedLoginName)) return { error: "login_name_taken" };

      const userId = `user-student-${randomBytes(12).toString("base64url")}`;
      const studentId = `student-${randomBytes(12).toString("base64url")}`;
      const createdAt = new Date().toISOString();
      const relationshipType = relationshipTypeForRole(actorRole);
      const profile = {
        currentSubjectIds: ["math-linear-equations"],
        profileStatus: "active",
        createdByRole: actorRole,
      };

      try {
        database.exec("BEGIN IMMEDIATE");
        statements.insertAccount.run(
          userId,
          normalizedLoginName,
          normalizedDisplayName,
          "student",
          studentId,
          createPasswordHash(normalizedPassword),
          createdAt,
          createdAt,
        );
        statements.insertStudentProfile.run(
          studentId,
          normalizedDisplayName,
          normalizedGradeLabel,
          JSON.stringify(profile),
          createdAt,
        );
        statements.insertStudentAccessLink.run(userId, studentId, "self", createdAt);
        statements.insertStudentAccessLink.run(actorUserId, studentId, relationshipType, createdAt);
        saveAccountAuditEvent({
          actorUserId,
          actorRole,
          targetUserId: userId,
          targetStudentId: studentId,
          actionType: "student_account_created",
          detail: { gradeLabel: normalizedGradeLabel, relationshipType },
        });
        database.exec("COMMIT");
      } catch (error) {
        try {
          database.exec("ROLLBACK");
        } catch {
          // The transaction may already have been closed by SQLite after a failed statement.
        }
        if (String(error?.message || "").includes("user_accounts.login_name")) return { error: "login_name_taken" };
        return { error: "student_account_creation_failed" };
      }

      return {
        user: toPublicAccount(statements.getAccountById.get(userId)),
        student: {
          studentId,
          displayName: normalizedDisplayName,
          gradeLabel: normalizedGradeLabel,
          relationshipType,
        },
      };
    },
    createStudentRelationshipInvite({ actorUserId, actorRole, studentId, targetRole }) {
      const actor = statements.getAccountById.get(actorUserId);
      const normalizedStudentId = String(studentId || "").trim();
      if (!actor || actor.account_status !== "active" || actor.role !== actorRole) return { error: "account_not_found" };
      if (!RELATIONSHIP_CREATOR_ROLES.has(actorRole) && actorRole !== "admin") return { error: "account_role_not_allowed" };
      if (!RELATIONSHIP_INVITABLE_ROLES.has(targetRole)) return { error: "invalid_relationship_role" };
      const hasStudentAccess = actorRole === "admin" || statements.findStudentAccessLink.get(actorUserId, normalizedStudentId);
      if (!normalizedStudentId || !hasStudentAccess) {
        return { error: "student_access_denied" };
      }
      const student = statements.getStudentProfile.get(normalizedStudentId);
      if (!student) return { error: "student_not_found" };

      const code = `AE-${randomBytes(9).toString("hex").toUpperCase()}`;
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      try {
        database.exec("BEGIN IMMEDIATE");
        statements.insertStudentRelationshipInvite.run(
          `relationship-invite-${randomBytes(12).toString("base64url")}`,
          hashRelationshipInviteCode(code),
          normalizedStudentId,
          actorUserId,
          targetRole,
          expiresAt,
          createdAt,
        );
        saveAccountAuditEvent({
          actorUserId,
          actorRole,
          targetStudentId: normalizedStudentId,
          actionType: "student_relationship_invited",
          detail: { targetRole, expiresAt },
        });
        database.exec("COMMIT");
      } catch {
        try {
          database.exec("ROLLBACK");
        } catch {
          // The transaction may already have been closed by SQLite after a failed statement.
        }
        return { error: "relationship_invite_creation_failed" };
      }

      return {
        invite: {
          code,
          studentId: normalizedStudentId,
          student: {
            displayName: student.display_name,
            gradeLabel: student.grade_label || null,
          },
          targetRole,
          expiresAt,
        },
      };
    },
    acceptStudentRelationshipInvite({ userId, userRole, code }) {
      const account = statements.getAccountById.get(userId);
      if (!account || account.account_status !== "active" || account.role !== userRole) return { error: "account_not_found" };
      if (!RELATIONSHIP_INVITABLE_ROLES.has(userRole)) return { error: "account_role_not_allowed" };
      const invite = statements.findStudentRelationshipInviteByCodeHash.get(hashRelationshipInviteCode(code));
      const now = new Date().toISOString();
      if (!invite || invite.invite_status !== "active" || invite.expires_at <= now) return { error: "relationship_invite_unavailable" };
      if (invite.target_role !== userRole) return { error: "relationship_invite_role_mismatch" };
      if (statements.findStudentAccessLink.get(userId, invite.student_id)) return { error: "student_relationship_already_active" };
      const student = statements.getStudentProfile.get(invite.student_id);
      if (!student) return { error: "student_not_found" };

      try {
        database.exec("BEGIN IMMEDIATE");
        const acceptedAt = new Date().toISOString();
        const accepted = statements.acceptStudentRelationshipInvite.run(userId, acceptedAt, invite.invite_id, acceptedAt);
        if (!accepted.changes) {
          database.exec("ROLLBACK");
          return { error: "relationship_invite_unavailable" };
        }
        statements.insertStudentAccessLink.run(userId, invite.student_id, relationshipTypeForRole(userRole), acceptedAt);
        saveAccountAuditEvent({
          actorUserId: userId,
          actorRole: userRole,
          targetStudentId: invite.student_id,
          actionType: "student_relationship_invite_accepted",
          detail: { invitedByUserId: invite.created_by_user_id },
        });
        database.exec("COMMIT");
      } catch {
        try {
          database.exec("ROLLBACK");
        } catch {
          // The transaction may already have been closed by SQLite after a failed statement.
        }
        return { error: "relationship_invite_acceptance_failed" };
      }

      return {
        student: {
          studentId: invite.student_id,
          displayName: student.display_name,
          gradeLabel: student.grade_label || null,
          relationshipType: relationshipTypeForRole(userRole),
        },
      };
    },
    revokeOwnStudentRelationship({ actorUserId, actorRole, studentId }) {
      const actor = statements.getAccountById.get(actorUserId);
      const normalizedStudentId = String(studentId || "").trim();
      if (!actor || actor.account_status !== "active" || actor.role !== actorRole) return { error: "account_not_found" };
      if (!RELATIONSHIP_INVITABLE_ROLES.has(actorRole)) return { error: "account_role_not_allowed" };
      const link = statements.getActiveStudentAccessLink.get(actorUserId, normalizedStudentId);
      if (!link) return { error: "student_relationship_not_active" };
      if (link.relationship_type === "self") return { error: "student_self_access_cannot_be_revoked" };

      try {
        database.exec("BEGIN IMMEDIATE");
        const revoked = statements.revokeStudentAccessLink.run(actorUserId, normalizedStudentId);
        if (!revoked.changes) {
          database.exec("ROLLBACK");
          return { error: "student_relationship_not_active" };
        }
        saveAccountAuditEvent({
          actorUserId,
          actorRole,
          targetUserId: actorUserId,
          targetStudentId: normalizedStudentId,
          actionType: "student_relationship_revoked",
          detail: {
            relationshipType: link.relationship_type,
            scope: "self_access_only",
          },
        });
        database.exec("COMMIT");
      } catch {
        try {
          database.exec("ROLLBACK");
        } catch {
          // The transaction may already be closed after a failed database statement.
        }
        return { error: "student_relationship_revoke_failed" };
      }

      return {
        studentId: normalizedStudentId,
        relationshipType: link.relationship_type,
        accessStatus: "revoked",
      };
    },
    updateAccountProfile({ userId, displayName }) {
      const normalizedName = validDisplayName(displayName);
      if (!normalizedName) return { error: "invalid_display_name" };
      const account = statements.getAccountById.get(userId);
      if (!account || account.account_status !== "active") return { error: "account_not_found" };
      const updatedAt = new Date().toISOString();
      const result = statements.updateAccountDisplayName.run(normalizedName, updatedAt, userId);
      if (!result.changes) return { error: "account_not_found" };
      if (account.display_name !== normalizedName) {
        saveAccountAuditEvent({
          actorUserId: userId,
          actorRole: account.role,
          targetUserId: userId,
          targetStudentId: account.student_id || null,
          actionType: "account_profile_updated",
          detail: { changedFields: ["displayName"] },
        });
      }
      return { user: toPublicAccount(statements.getAccountById.get(userId)) };
    },
    changeAccountPassword({ userId, currentPassword, newPassword, currentToken }) {
      const account = statements.getAccountById.get(userId);
      if (!account || account.account_status !== "active") return { error: "account_not_found" };
      if (!verifyPassword(String(currentPassword || ""), account.password_hash)) return { error: "current_password_incorrect" };
      const normalizedPassword = validNewPassword(newPassword);
      if (!normalizedPassword) return { error: "password_policy_not_met" };
      statements.updateAccountPassword.run(createPasswordHash(normalizedPassword), new Date().toISOString(), userId);
      if (currentToken) statements.deleteOtherAuthSessionsForUser.run(userId, hashSessionToken(currentToken));
      saveAccountAuditEvent({
        actorUserId: userId,
        actorRole: account.role,
        targetUserId: userId,
        targetStudentId: account.student_id || null,
        actionType: "account_password_changed",
        detail: { otherSessionsCleared: Boolean(currentToken) },
      });
      return { user: toPublicAccount(statements.getAccountById.get(userId)) };
    },
    createAuthSession({ userId, durationHours = 24 * 14 }) {
      const account = statements.getAccountById.get(userId);
      if (!account || account.account_status !== "active") return null;
      statements.deleteExpiredAuthSessions.run(new Date().toISOString());
      const token = randomBytes(32).toString("base64url");
      const sessionId = `session-${randomBytes(12).toString("base64url")}`;
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + Math.max(1, durationHours) * 60 * 60 * 1000).toISOString();
      statements.insertAuthSession.run(sessionId, hashSessionToken(token), userId, expiresAt, createdAt);
      return { token, expiresAt, user: toPublicAccount(account) };
    },
    getAuthSession({ token }) {
      if (!token) return null;
      const row = statements.findAuthSession.get(hashSessionToken(token), new Date().toISOString());
      return row ? { sessionId: row.session_id, expiresAt: row.expires_at, user: toPublicAccount(row) } : null;
    },
    canUserAccessStudent({ userId, studentId }) {
      if (!userId || !studentId) return false;
      return Boolean(statements.findStudentAccessLink.get(userId, studentId));
    },
    listAccessibleStudents({ userId }) {
      if (!userId) return [];
      return statements.listStudentAccessLinks.all(userId).map((row) => ({
        studentId: row.student_id,
        relationshipType: row.relationship_type,
        displayName: row.display_name || "学生",
        gradeLabel: row.grade_label || null,
      }));
    },
    getStudentProfile({ studentId }) {
      const row = statements.getStudentProfile.get(studentId);
      if (!row) return null;
      return {
        studentId: row.student_id,
        displayName: row.display_name,
        gradeLabel: row.grade_label || null,
        ...parseJson(row.profile_json),
      };
    },
    listAccountAuditEvents({ actorUserId, limit = 50 }) {
      if (!actorUserId) return [];
      return statements.listAccountAuditEvents
        .all(actorUserId, Math.min(Math.max(Number(limit) || 50, 1), 200))
        .map((row) => ({
          actorUserId: row.actor_user_id,
          actorRole: row.actor_role,
          targetUserId: row.target_user_id || null,
          targetStudentId: row.target_student_id || null,
          actionType: row.action_type,
          detail: parseJson(row.event_json) || {},
          createdAt: row.created_at,
        }));
    },
    deleteAuthSession({ token }) {
      if (!token) return false;
      return statements.deleteAuthSessionByToken.run(hashSessionToken(token)).changes > 0;
    },
    listStudentMessages({ studentId, limit = 50 }) {
      return statements.listStudentMessages
        .all(studentId, Math.min(Math.max(Number(limit) || 50, 1), 200))
        .map((row) => parseJson(row.message_json))
        .filter(Boolean);
    },
    listBehaviorEvents({ studentId, subjectId = null, limit = 2000 }) {
      return statements.listEvents
        .all(studentId, Math.min(Math.max(Number(limit) || 2000, 1), 2000))
        .map((row) => parseJson(row.event_json))
        .filter(Boolean)
        .filter((event) => {
          if (!subjectId) return true;
          const eventSubjectId = event.subjectId || event.payload?.subjectId || null;
          // Retain older one-subject prototype events until scoped evidence replaces them.
          return !eventSubjectId || eventSubjectId === subjectId;
        });
    },
    saveAssessmentSession(session) {
      statements.upsertAssessmentSession.run(
        session.id,
        session.studentId,
        session.subjectId,
        session.assessmentType,
        session.updatedAt || new Date().toISOString(),
        JSON.stringify(session),
      );
      return session;
    },
    saveDailyPracticeSession(session) {
      statements.upsertDailyPracticeSession.run(
        session.id,
        session.studentId,
        session.subjectId,
        session.practiceDate,
        session.updatedAt || new Date().toISOString(),
        JSON.stringify(session),
      );
      return session;
    },
    saveDailyPracticePlan(plan) {
      statements.upsertDailyPracticePlan.run(
        plan.id,
        plan.studentId,
        plan.subjectId,
        plan.practiceDate,
        plan.createdAt || new Date().toISOString(),
        plan.updatedAt || new Date().toISOString(),
        JSON.stringify(plan),
      );
      return plan;
    },
    getDailyPracticeRun({ studentId, subjectId, practiceDate }) {
      const row = statements.getDailyPracticeRun.get(studentId, subjectId, practiceDate);
      return row ? parseJson(row.run_json) : null;
    },
    getDailyPracticeRunById({ runId }) {
      const row = statements.getDailyPracticeRunById.get(runId);
      return row ? parseJson(row.run_json) : null;
    },
    saveDailyPracticeRun(run) {
      statements.upsertDailyPracticeRun.run(
        run.id,
        run.studentId,
        run.subjectId,
        run.practiceDate,
        run.createdAt || new Date().toISOString(),
        run.updatedAt || new Date().toISOString(),
        JSON.stringify(run),
      );
      return run;
    },
    saveQuestionDelivery(delivery) {
      statements.upsertQuestionDelivery.run(
        delivery.id,
        delivery.studentId,
        delivery.subjectId,
        delivery.mode,
        delivery.status,
        delivery.createdAt || new Date().toISOString(),
        delivery.updatedAt || new Date().toISOString(),
        JSON.stringify(delivery),
      );
      return delivery;
    },
    saveObserverWorkspace(record) {
      statements.upsertObserverWorkspace.run(
        record.actorUserId,
        record.studentId,
        JSON.stringify(record),
        record.updatedAt || new Date().toISOString(),
      );
      return record;
    },
    saveStudentMessage(message) {
      statements.insertStudentMessage.run(
        message.id,
        message.studentId,
        message.createdAt || new Date().toISOString(),
        JSON.stringify(message),
      );
      return message;
    },
    saveStudentPreferences(record) {
      statements.upsertStudentPreferences.run(
        record.studentId,
        JSON.stringify(record),
        record.updatedAt || new Date().toISOString(),
      );
      return record;
    },
    saveStudentOnboardingPrefill(record) {
      statements.upsertStudentOnboardingPrefill.run(
        record.studentId,
        JSON.stringify(record),
        record.updatedAt || new Date().toISOString(),
      );
      return record;
    },
    saveStudentLearningGoalDraft(record) {
      statements.upsertStudentLearningGoalDraft.run(
        record.studentId,
        record.subjectId,
        JSON.stringify(record),
        record.updatedAt || new Date().toISOString(),
      );
      return record;
    },
    saveBehaviorEvent(event) {
      statements.insertEvent.run(
        event.eventId,
        event.studentId,
        event.eventType,
        event.timestamp || new Date().toISOString(),
        JSON.stringify(event),
      );
      return event;
    },
    savePlan(record) {
      statements.upsertPlan.run(
        record.studentId,
        record.subjectId,
        JSON.stringify(record),
        record.updatedAt || new Date().toISOString(),
      );
      return record;
    },
  };
}
