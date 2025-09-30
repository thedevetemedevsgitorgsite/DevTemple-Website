import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPA_URL,
  process.env.PUBLIC_SUPA_R_KEY
);

export async function handler(event) {
  try {
    const { reference, cart } = JSON.parse(event.body);

    // verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });
    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return { statusCode: 400, body: JSON.stringify({ error: "Verification failed" }) };
    }

    const buyerEmail = paystackData.data.customer.email;
    let downloadLinks = [];

    for (const item of cart) {
      // update sales
      await supabase.from("posts")
        .update({ sales: (item.sales || 0) + 1 })
        .eq("id", item.id);

      // insert earnings
      await supabase.from("earnings")
        .insert({
          seller_id: item.sellerId,
          post_id: item.id,
          amount: item.price,
          buyer: buyerEmail,
        });

      // signed download link
      const { data: signedUrl } = await supabase.storage
        .from("uploads")
        .createSignedUrl(item.filePath, 60 * 60);

      if (signedUrl?.signedUrl) {
        downloadLinks.push({ id: item.id, url: signedUrl.signedUrl });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, downloadLinks })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
