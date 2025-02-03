import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.email || !user.id) {
      console.error("🔴 Error: Missing user data from Kinde.");
      return NextResponse.json({ error: "User data is incomplete" }, { status: 400 });
    }

    console.log("🔵 Syncing user:", user.email);

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("User")
      .select("UserID")
      .eq("Email", user.email)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("⚠️ Error fetching user:", fetchError);
      return NextResponse.json({ error: "Database query error" }, { status: 500 });
    }

    if (existingUser) {
      console.log("🟢 User already exists in database.");
      return NextResponse.json({ message: "User already exists" }, { status: 200 });
    }

    console.log("🟡 User not found in database. Creating new user...");

    // Insert new user
    const { error: insertError } = await supabase
      .from("User")
      .insert([
        {
          KindeUserID: user.id, // ✅ Matches the renamed column
          Email: user.email,
          FirstName: user.given_name || null,
          LastName: user.family_name || null,
          Role: "User",
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString(), // ✅ Ensure `UpdatedAt` is set
        },
      ]);

    if (insertError) {
      console.error("❌ Error inserting user:", insertError);
      return NextResponse.json({ error: "Database insert error" }, { status: 500 });
    }

    console.log("✅ User successfully created!");
    return NextResponse.json({ message: "User created" }, { status: 201 });

  } catch (error) {
    console.error("🚨 Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
