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
      .from("transactions_b")
      .select("*")
      .eq("reference", reference)
      .single();

    if (txError || !transaction) {
      return { statusCode: 404, body: JSON.stringify({ error: "Transaction not found" }) };
    }

    // Update transaction status
    await supabase
      .from("transactions_b")
      .update({ status: "success" })
      .eq("reference", reference);

    const cart = transaction.cart_data;
    const buyerEmail = payment.customer.email;
    let downloadLinks = [];

    console.log("Processing cart items:", cart);

    // Process each item in cart
    for (const item of cart) {
      try {
        // First, get the current post data to ensure it exists and get user_id (seller)
        const { data: post, error: postError } = await supabase
          .from("posts")
          .select("sales, user_id")  // Only get user_id since that's the seller
          .eq("id", item.id)
          .single();

        if (postError) {
          console.error(`Error fetching post ${item.id}:`, postError);
          continue;
        }

        const sellerId = post.user_id;  // user_id is the seller
        
        if (!sellerId) {
          console.error(`No user_id (seller) found for post ${item.id}`);
          continue;
        }

        console.log(`Processing item ${item.id} for seller (user_id): ${sellerId}`);

        // Update sales count - increment by 1
        const newSales = (post.sales || 0) + 1;
        const { error: updateError } = await supabase
          .from("posts")
          .update({ sales: newSales })
          .eq("id", item.id);

        if (updateError) {
          console.error(`Error updating sales for post ${item.id}:`, updateError);
        } else {
          console.log(`Updated sales for post ${item.id} to ${newSales}`);
        }

        // Insert earnings record - using user_id as seller_id
        const { error: earningsError } = await supabase
          .from("earnings")
          .insert({
            seller_id: sellerId,  // This is the user_id from posts table
            post_id: item.id,
            amount: item.price,
            buyer: buyerEmail,
            created_at: new Date().toISOString()
          });

        if (earningsError) {
          console.error(`Error creating earnings record for post ${item.id}:`, earningsError);
          console.error("Earnings error details:", earningsError);
        } else {
          console.log(`✅ Created earnings record for post ${item.id}, seller ${sellerId}, amount ${item.price}`);
        }

        // Create signed download URL
        if (item.filePath) {
          const { data: signedUrl, error: signedUrlError } = await supabase.storage
            .from("uploads")
            .createSignedUrl(item.filePath, 60 * 60 * 24);

          if (signedUrlError) {
            console.error(`Error creating signed URL for ${item.filePath}:`, signedUrlError);
          } else if (signedUrl?.signedUrl) {
            downloadLinks.push({ 
              id: item.id, 
              title: item.title,
              url: signedUrl.signedUrl 
            });
          }
        }

      } catch (itemError) {
        console.error(`Error processing cart item ${item.id}:`, itemError);
      }
    }

    console.log("Completed processing. Download links:", downloadLinks.length);

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
    console.error("Verify-pay overall error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
