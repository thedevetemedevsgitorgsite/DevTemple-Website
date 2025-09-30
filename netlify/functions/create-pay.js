
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPA_URL,
  process.env.PUBLIC_SUPA_R_KEY
);

export async function handler(event) {
  try {
    const { email, cart } = JSON.parse(event.body);

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    // Store transaction in Supabase first
    const { data: transaction, error: txError } = await supabase
      .from("transactions_b")
      .insert([
        {
          email,
          amount: total,
          cart_data: cart, // Store entire cart for verification
          status: "pending",
        }
      ])
      .select()
      .single();

    if (txError) throw txError;

    const payRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SEC_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: total * 100,
        currency: "NGN",
        metadata: {
          transaction_id: transaction.id,
          cart_count: cart.length
        }
      })
    });

    const data = await payRes.json();

    if (!data.status) {
      return { statusCode: 400, body: JSON.stringify({ error: data.message }) };
    }

    // Update transaction with Paystack reference
    await supabase
      .from("transactions_b")
      .update({ reference: data.data.reference })
      .eq("id", transaction.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
