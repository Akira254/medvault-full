import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from './prisma';

const STUDENT_COOKIE = 'mv_student_session';
const ADMIN_COOKIE = 'mv_admin_session';

const getStudentSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || 'dev-student-secret-change-in-production-32chars');

const getAdminSecret = () =>
  new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'dev-admin-secret-change-in-production-32chars');

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createStudentSession(user: { id: string; role: string; username: string; fullName: string }) {
  const token = await new SignJWT({
    sub: user.id,
    role: user.role,
    username: user.username,
    fullName: user.fullName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getStudentSecret());

  cookies().set(STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getStudentSession() {
  const token = cookies().get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getStudentSecret());
    return {
      userId: payload.sub as string,
      role: payload.role as string,
      username: payload.username as string,
      fullName: payload.fullName as string,
    };
  } catch {
    return null;
  }
}

export function clearStudentSession() {
  cookies().delete(STUDENT_COOKIE);
}

/**
 * STRICT ADMIN SESSION (Section 2):
 * - Session-only cookie (NO Max-Age or Expires) -> destroyed when browser/tab ends
 * - Single active session per admin (invalidates prior sessions)
 * - Idle timeout: 10 mins (configurable), Absolute timeout: 60 mins (configurable)
 */
export async function createAdminSession(userId: string, ipAddress?: string, userAgent?: string) {
  // Invalidate any previous admin session for this account
  await prisma.adminSession.deleteMany({ where: { userId } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const absMinutes = Number(process.env.ADMIN_ABSOLUTE_TIMEOUT_MINUTES || 60);
  const expiresAt = new Date(Date.now() + absMinutes * 60 * 1000);

  const session = await prisma.adminSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  const jwt = await new SignJWT({
    sid: session.id,
    sub: userId,
    raw: rawToken,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${absMinutes}m`)
    .sign(getAdminSecret());

  // Session-only cookie: omit maxAge & expires!
  cookies().set(ADMIN_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return session;
}

export async function getValidAdminSession() {
  const jwt = cookies().get(ADMIN_COOKIE)?.value;
  if (!jwt) return null;

  try {
    const { payload } = await jwtVerify(jwt, getAdminSecret());
    const sid = payload.sid as string;
    const raw = payload.raw as string;

    const session = await prisma.adminSession.findUnique({
      where: { id: sid },
      include: { user: true },
    });

    if (!session || session.tokenHash !== hashToken(raw)) return null;

    const now = new Date();
    const idleMinutes = Number(process.env.ADMIN_IDLE_TIMEOUT_MINUTES || 10);
    const idleCutoff = new Date(now.getTime() - idleMinutes * 60 * 1000);

    // Check absolute and idle expiration
    if (session.expiresAt < now || session.lastActiveAt < idleCutoff) {
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Update lastActiveAt
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActiveAt: now },
    });

    return session;
  } catch {
    return null;
  }
}

export async function revokeAdminSession() {
  const jwt = cookies().get(ADMIN_COOKIE)?.value;
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, getAdminSecret());
      if (payload.sid) {
        await prisma.adminSession.delete({ where: { id: payload.sid as string } }).catch(() => {});
      }
    } catch {}
  }
  cookies().delete(ADMIN_COOKIE);
}
