import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPA_URL,
  process.env.PUBLIC_SUPA_R_KEY
);

export async function handler(event) {
  console.log("Create Pay Function Started");
  
  try {
    const body = JSON.parse(event.body);
    console.log("Request Body:", body);
    
    const { email, cart } = body;

    // Validate required fields
    if (!email) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Email is required" }) 
      };
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Cart is empty or invalid" }) 
      };
    }

    const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);
    console.log("Calculated Total:", total);

    if (total <= 0) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Invalid total amount" }) 
      };
    }

    // Store transaction in Supabase
    const { data: transaction, error: txError } = await supabase
      .from("transactions_b")
      .insert([
        {
          email,
          amount: total,
          cart_data: cart,
          status: "pending",
        }
      ])
      .select()
      .single();

    if (txError) {
      console.error("Supabase Transaction Error:", txError);
      throw new Error(`Database error: ${txError.message}`);
    }

    console.log("Transaction created:", transaction.id);

    // Check if Paystack key is available
    if (!process.env.PAYSTACK_SEC_KEY) {
      throw new Error("Paystack secret key is missing");
    }

    const paystackBody = {
      email,
      amount: Math.round(total * 100), // Ensure integer
      currency: "NGN",
      metadata: {
        transaction_id: transaction.id,
        cart_count: cart.length
      }
    };

    console.log("Paystack Request:", paystackBody);

    const payRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SEC_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paystackBody)
    });

    const responseText = await payRes.text();
    console.log("Paystack Raw Response:", responseText);

    const data = JSON.parse(responseText);

    if (!data.status) {
      console.error("Paystack API Error:", data);
      
      // Update transaction status to failed
      await supabase
        .from("transactions_b")
        .update({ status: "failed", error_message: data.message })
        .eq("id", transaction.id);

      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: data.message || "Paystack initialization failed",
          details: data 
        }) 
      };
    }

    console.log("Paystack Success:", data);

    // Update transaction with Paystack reference
    await supabase
      .from("transactions_b")
      .update({ 
        reference: data.data.reference,
        status: "initialized" 
      })
      .eq("id", transaction.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      })
    };

  } catch (err) {
    console.error("Unhandled Error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: "Internal server error",
        message: err.message 
      }) 
    };
  }
}

