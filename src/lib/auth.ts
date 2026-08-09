import { cookies } from "next/headers";
import studentsData from "../../data/students.json";
import type { StudentSession } from "./student-types";

export type { StudentSession } from "./student-types";

export const SESSION_COOKIE = "ssc_student_session";

type StudentRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
  programId: string;
  enrolledModuleCodes: string[];
};

export function findStudentByCredentials(
  email: string,
  password: string,
): StudentSession | null {
  const student = (studentsData.students as StudentRecord[]).find(
    (s) => s.email.toLowerCase() === email.trim().toLowerCase() && s.password === password,
  );
  if (!student) return null;
  return toSession(student);
}

export function findStudentById(id: string): StudentSession | null {
  const student = (studentsData.students as StudentRecord[]).find((s) => s.id === id);
  if (!student) return null;
  return toSession(student);
}

function toSession(student: StudentRecord): StudentSession {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    programId: student.programId,
    enrolledModuleCodes: student.enrolledModuleCodes,
  };
}

export async function getSessionFromCookies(): Promise<StudentSession | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return findStudentById(id);
}
