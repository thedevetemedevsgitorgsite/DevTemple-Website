
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPA_URL,
  process.env.PUBLIC_SUPA_R_KEY
);

export async function handler(event) {
  try {
    const { reference } = JSON.parse(event.body);

    // Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SEC_KEY}` }
    });
    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== "success") {
      return { statusCode: 400, body: JSON.stringify({ error: "Payment verification failed" }) };
    }

    const payment = paystackData.data;
    
    // Get transaction from Supabase
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("reference", reference)
      .single();

    if (txError || !transaction) {
      return { statusCode: 404, body: JSON.stringify({ error: "Transaction not found" }) };
    }

    // Update transaction status
    await supabase
      .from("transactions")
      .update({ status: "success" })
      .eq("reference", reference);

    const cart = transaction.cart_data;
    const buyerEmail = payment.customer.email;
    let downloadLinks = [];

    // Process each item in cart
    for (const item of cart) {
      // Update sales count
      await supabase.from("posts")
        .update({ sales: (item.sales || 0) + 1 })
        .eq("id", item.id);

      // Insert earnings record

      await supabase.from("posts")
        .update({ sales: (item.sales || 0) + 1 })
        .eq("id", item.id);
      
      await supabase.from("earnings")
        .insert({
          seller_id: item.sellerId,
          post_id: item.id,
          amount: item.price,
          buyer: buyerEmail,
        });

      // Create signed download URL (valid for 24 hours)
      const { data: signedUrl } = await supabase.storage
        .from("uploads")
        .createSignedUrl(item.filePath, 60 * 60 * 24); // 24 hours

      if (signedUrl?.signedUrl) {
        downloadLinks.push({ 
          id: item.id, 
          title: item.title,
          url: signedUrl.signedUrl 
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        downloadLinks,
        reference: payment.reference,
        amount: payment.amount / 100,
        customer: buyerEmail
      })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
