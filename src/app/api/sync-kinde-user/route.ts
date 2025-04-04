import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ Define the POST function for App Router
export async function POST(req: Request) {
  try {
    // ✅ Parse the request body
    const body = await req.json();
    const { email, firstName, lastName, kindeId, primaryUserEmail } = body;

    if (!email || !kindeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ Check if the user already exists in the User table
    const { data: user, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("Email", email)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("❌ User fetch error:", userError);
      return NextResponse.json({ error: "Failed to check user existence." }, { status: 500 });
    }

    // ✅ If the user does not exist, create a new user
    let userData = user;
    if (!userData) {
      const { data: newUser, error: insertUserError } = await supabase
        .from("User")
        .insert([
          { 
            Email: email, 
            FirstName: firstName, 
            LastName: lastName, 
            KindeUserID: kindeId,
            UpdatedAt: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertUserError) {
        console.error("❌ Error inserting new user:", insertUserError);
        return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
      }

      userData = newUser;
    }

    // ✅ If primaryUserEmail exists, link the user as a sub-user
    if (primaryUserEmail) {
      const { data: primaryUser, error: primaryUserError } = await supabase
        .from("User")
        .select("UserID")
        .eq("Email", primaryUserEmail)
        .single();

      if (primaryUserError || !primaryUser) {
        console.error("❌ Primary user not found:", primaryUserError);
        return NextResponse.json({ error: "Primary user not found." }, { status: 400 });
      }

      // ✅ Add the user as a sub-user under the primary user
      const { error: subUserError } = await supabase
        .from("SubUsers")
        .insert([{ PrimaryUserID: primaryUser.UserID, Email: email }]);

      if (subUserError) {
        console.error("❌ Error adding sub-user:", subUserError);
        return NextResponse.json({ error: "Failed to add sub-user." }, { status: 500 });
      }
    }

    console.log("Syncing user with email:", email);
    console.log("First Name:", firstName);
    console.log("Last Name:", lastName);
    console.log("Kinde ID:", kindeId);

    return NextResponse.json({ message: "User synced successfully." }, { status: 200 });
  } catch (error) {
    console.error("❌ Sync error:", error);
    return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
  }
}
