import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPA_URL,
  process.env.PUBLIC_SUPA_R_KEY
);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { user_id } = JSON.parse(event.body);
    if (!user_id) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing user_id" }) };
    }

    // Delete user posts
    await supabase.from("posts").delete().eq("user_id", user_id);

    // Delete withdrawals
    await supabase.from("withdrawals").delete().eq("user_id", user_id);

    // Delete profile
    await supabase.from("profiles").delete().eq("id", user_id);

    // Optional: also remove files from storage
    // (use supabase.storage.from("bucket").remove([...file paths]))

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Account deleted successfully." }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
}
