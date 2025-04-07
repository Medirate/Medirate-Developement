import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query Supabase to fetch the user by email
    const { data: dbUser, error: userError } = await supabase
      .from("User") // Fetch user data
      .select("UserID, FirstName, LastName, Email, Picture, Role")
      .eq("Email", user.email)
      .single();

    if (userError) {
      console.error("❌ Supabase Error (User):", userError);
      return NextResponse.json({ error: "Database query error" }, { status: 500 });
    }

    // Query Supabase to fetch registration form data by email
    const { data: registrationData, error: registrationError } = await supabase
      .from("registrationform") // Table name is "registrationform"
      .select("*")
      .eq("email", user.email)
      .single();

    if (registrationError) {
      console.error("❌ Supabase Error (Registration Form):", registrationError);
      return NextResponse.json({ error: "Database query error" }, { status: 500 });
    }

    return NextResponse.json({
      user: dbUser,
      registration: registrationData,
    });
  } catch (error) {
    console.error("🚨 Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
