<<<<<<< HEAD
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
    const { data: dbUser, error } = await supabase
      .from("User") // ✅ Table name must match Supabase schema
      .select("UserID, FirstName, LastName, Email, Picture, Role")
      .eq("Email", user.email)
      .single();

    if (error) {
      console.error("❌ Supabase Error:", error);
      return NextResponse.json({ error: "Database query error" }, { status: 500 });
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("🚨 Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
=======
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
    const { data: dbUser, error } = await supabase
      .from("User") // ✅ Table name must match Supabase schema
      .select("UserID, FirstName, LastName, Email, Picture, Role")
      .eq("Email", user.email)
      .single();

    if (error) {
      console.error("❌ Supabase Error:", error);
      return NextResponse.json({ error: "Database query error" }, { status: 500 });
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("🚨 Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
>>>>>>> origin/main
