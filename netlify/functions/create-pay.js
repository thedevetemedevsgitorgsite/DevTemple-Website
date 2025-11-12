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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email is required" }) 
      };
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return { 
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Cart is empty or invalid" }) 
      };
    }

    const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);
    console.log("Calculated Total:", total);

    if (total <= 0) {
      return { 
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
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
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: `Database error: ${txError.message}`,
          details: txError
        })
      };
    }

    console.log("Transaction created:", transaction.id);

    // Check if Paystack key is available
    if (!process.env.PAYSTACK_SEC_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Paystack configuration error" })
      };
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
    console.log("Paystack Status Code:", payRes.status);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Paystack response:", parseError);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Invalid response from payment gateway",
          raw_response: responseText.substring(0, 200) // First 200 chars
        })
      };
    }

    if (!data.status) {
      console.error("Paystack API Error:", data);
      
      // Update transaction status to failed
      await supabase
        .from("transactions_b")
        .update({ 
          status: "failed", 
          error_message: data.message || "Unknown Paystack error"
        })
        .eq("id", transaction.id);

      return { 
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: data.message || "Payment initialization failed",
          paystack_error: data
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      })
    };

  } catch (err) {
    console.error("Unhandled Error:", err);
    return { 
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Internal server error",
        message: err.message,
        stack: err.stack
      }) 
    };
  }
}
