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

  const { primaryUserEmail, subUserEmail } = req.body;

  if (!primaryUserEmail || !subUserEmail) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // ✅ Fetch Primary User (Ensure they exist)
    const { data: primaryUser, error: primaryUserError } = await supabase
      .from("User")
      .select("UserID")
      .eq("Email", primaryUserEmail)
      .single();

    if (primaryUserError || !primaryUser) {
      return res.status(404).json({ error: "Primary user not found" });
    }

    // ✅ Check if Sub-User already exists
    const { data: existingSubUser } = await supabase
      .from("SubUsers")
      .select("SubUserID")
      .eq("Email", subUserEmail)
      .single();

    if (existingSubUser) {
      return res.status(400).json({ error: "Sub-user already exists" });
    }

    // ✅ Insert New Sub-User
    const { error: insertError } = await supabase.from("SubUsers").insert([
      {
        PrimaryUserID: primaryUser.UserID,
        Email: subUserEmail,
      },
    ]);

    if (insertError) {
      console.error("❌ Error inserting sub-user:", insertError);
      return res.status(500).json({ error: "Failed to add sub-user." });
    }

    return res.status(200).json({ message: "Sub-user added successfully!" });
  } catch (error) {
    console.error("❌ Sub-user API error:", error);
    return res.status(500).json({ error: "Unexpected error occurred." });
  }
}
