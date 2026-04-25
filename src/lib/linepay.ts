import crypto from 'crypto'

const CHANNEL_ID     = process.env.LINE_PAY_CHANNEL_ID!
const CHANNEL_SECRET = process.env.LINE_PAY_CHANNEL_SECRET!
const IS_SANDBOX     = process.env.LINE_PAY_IS_SANDBOX === 'true'
const BASE_URL       = IS_SANDBOX
  ? 'https://sandbox-api-pay.line.me'
  : 'https://api-pay.line.me'

function sign(uri: string, body: string, nonce: string) {
  const msg = CHANNEL_SECRET + uri + body + nonce
  return crypto.createHmac('sha256', CHANNEL_SECRET).update(msg).digest('base64')
}

export async function linePayRequest(
  orderId: string,
  amount: number,
  productName: string,
  confirmUrl: string,
  cancelUrl: string,
) {
  const uri   = '/v3/payments/request'
  const nonce = crypto.randomUUID()
  const body  = JSON.stringify({
    amount,
    currency: 'TWD',
    orderId,
    packages: [{ id: orderId, amount, products: [{ name: productName, quantity: 1, price: amount }] }],
    redirectUrls: { confirmUrl, cancelUrl },
  })
  const res = await fetch(BASE_URL + uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': CHANNEL_ID,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': sign(uri, body, nonce),
    },
    body,
  })
  return res.json()
}

export async function linePayConfirm(transactionId: string, amount: number) {
  const uri   = `/v3/payments/${transactionId}/confirm`
  const nonce = crypto.randomUUID()
  const body  = JSON.stringify({ amount, currency: 'TWD' })
  const res = await fetch(BASE_URL + uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': CHANNEL_ID,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': sign(uri, body, nonce),
    },
    body,
  })
  return res.json()
}
