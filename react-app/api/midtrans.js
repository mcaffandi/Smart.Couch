export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

  try {
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(SERVER_KEY + ':').toString('base64')}`
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: req.body.order_id,
          gross_amount: req.body.gross_amount
        },
        customer_details: {
          first_name: req.body.first_name,
          email: req.body.email
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_messages ? data.error_messages[0] : 'Failed to create transaction');
    }

    res.status(200).json({ token: data.token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
