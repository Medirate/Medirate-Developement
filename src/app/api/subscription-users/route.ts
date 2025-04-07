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
      console.error("❌ Unauthorized: User or email is missing.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔵 Fetching sub-users for:", user.email);

    // Fetch the sub-users for the primary user
    const { data, error } = await supabase
      .from("subscription_users")
      .select("sub_users")
      .eq("primary_user", user.email)
      .single();

    if (error) {
      // If no entry exists, create one with an empty array for sub_users
      if (error.code === "PGRST116") { // PGRST116 is the code for "No rows found"
        console.log("🟡 No entry found, creating a new one.");
        const { data: newData, error: newError } = await supabase
          .from("subscription_users")
          .upsert({ primary_user: user.email, sub_users: [] })
          .select("sub_users")
          .single();

        if (newError) {
          console.error("❌ Supabase Error (Creating Entry):", newError);
          return NextResponse.json({ error: "Database update error" }, { status: 500 });
        }

        console.log("✅ New entry created successfully:", newData?.sub_users || []);
        return NextResponse.json({ subUsers: newData?.sub_users || [] });
      }

      console.error("❌ Supabase Error:", error);
      return NextResponse.json({ error: "Database query error" }, { status: 500 });
    }

    console.log("✅ Sub-users fetched successfully:", data?.sub_users || []);
    return NextResponse.json({ subUsers: data?.sub_users || [] });
  } catch (error) {
    console.error("🚨 Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subUsers } = await request.json();

    // Upsert the sub-users for the primary user
    const { error } = await supabase
      .from("subscription_users")
      .upsert({ primary_user: user.email, sub_users: subUsers });

    if (error) {
      console.error("❌ Supabase Error:", error);
      return NextResponse.json({ error: "Database update error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("🚨 Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 