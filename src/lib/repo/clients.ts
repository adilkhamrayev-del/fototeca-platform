import { pool } from "@/lib/db";

export type ClientSummary = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
};

// Used by the personal-cabinet login (src/app/account/login) to check a
// phone number actually has orders under it before starting a session —
// and by anything else that needs a client's own name/email by phone.
export async function findClientByPhone(phone: string): Promise<ClientSummary | null> {
  const { rows } = await pool.query<{
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  }>("select id, full_name, phone, email from clients where phone = $1", [phone]);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    fullName: rows[0].full_name,
    phone: rows[0].phone,
    email: rows[0].email,
  };
}
