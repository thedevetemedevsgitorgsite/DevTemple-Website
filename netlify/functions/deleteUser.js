
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

    // First, get all posts by this user to handle file storage deletion
    const { data: userPosts, error: postsError } = await supabase
      .from("posts")
      .select("id, file_path")
      .eq("user_id", user_id);

    if (postsError) throw postsError;

    // Delete stars associated with user's posts
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map(post => post.id);
      
      // Delete stars that reference user's posts
      const { error: starsError } = await supabase
        .from("stars")
        .delete()
        .in("post_id", postIds);

      if (starsError) throw starsError;

      // Delete files from storage
      const filePaths = userPosts
        .map(post => post.file_path)
        .filter(path => path); // Remove null/undefined paths

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("uploads")
          .remove(filePaths);

        if (storageError) {
          console.error("Storage deletion error:", storageError);
          // Continue with deletion even if storage fails
        }
      }
    }

    // Delete stars where user is the starrer
    const { error: userStarsError } = await supabase
      .from("stars")
      .delete()
      .eq("user_id", user_id);

    if (userStarsError) throw userStarsError;

    // Delete user's posts
    const { error: postsDeleteError } = await supabase
      .from("posts")
      .delete()
      .eq("user_id", user_id);

    if (postsDeleteError) throw postsDeleteError;

    // Delete withdrawals
    const { error: withdrawalsError } = await supabase
      .from("withdrawals")
      .delete()
      .eq("user_id", user_id);

    if (withdrawalsError) throw withdrawalsError;

    // Finally delete profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileError) throw profileError;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Account deleted successfully." }),
    };
  } catch (err) {
    console.error("Account deletion error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: "Failed to delete account: " + err.message }) 
    };
  }
}
