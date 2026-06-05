export default async function handler(req, res) {
  if (req.method === 'POST') {
    const notification = req.body;
    console.log('Midtrans Webhook Received:', notification);
    
    // For now, just return 200 OK so Midtrans knows we received it.
    // Later we can implement Firestore logic here to update user's PRO status automatically.
    res.status(200).json({ status: 'ok' });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
