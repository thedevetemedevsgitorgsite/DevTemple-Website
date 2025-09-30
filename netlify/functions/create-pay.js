import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { email, cart } = JSON.parse(event.body);

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    const payRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SEC_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: total * 100, // Paystack uses kobo
        currency: "NGN",
      })
    });

    const data = await payRes.json();

    if (!data.status) {
      return { statusCode: 400, body: JSON.stringify({ error: data.message }) };
    }

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
