import { db } from "@/lib/db/client";

let dbAvailable: boolean | null = null;

export async function isDbAvailable(): Promise<boolean> {
  if (dbAvailable !== null) return dbAvailable;
  try {
    if (!db?.user?.findFirst || !db?.tvShow?.findFirst) {
      dbAvailable = false;
      return false;
    }
    await db.user.findFirst();
    await db.tvShow.findFirst();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}
