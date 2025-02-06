import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, firstName, lastName, kindeId, primaryUserEmail } = req.body;

  if (!email || !kindeId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Your existing API logic here
  } catch (error) {
    console.error("❌ Sync error:", error);
    return res.status(500).json({ error: "Unexpected error occurred." });
  }
}
