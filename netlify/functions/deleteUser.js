// netlify/functions/deleteUser.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.PUBLIC_SUPA_URL,
  process.env.PUBLIC_SUPA_R_KEY
);

export const handler = async (event) => {
  try {
    const { uid } = JSON.parse(event.body);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};
