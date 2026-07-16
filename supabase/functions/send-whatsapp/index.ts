// Supabase Edge Function: send-whatsapp
// Deploy: supabase functions deploy send-whatsapp
//
// Environment Variables (set in Supabase Dashboard):
//   WHATSAPP_API_URL    — e.g. https://graph.facebook.com/v18.0/{phone-number-id}/messages
//   WHATSAPP_API_TOKEN  — Your WhatsApp Business API bearer token
//
// This function is called from the frontend via supabase.functions.invoke('send-whatsapp', { body: {...} })

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WhatsApp message templates
const TEMPLATES = {
  booking_confirmed: (params) => ({
    messaging_product: 'whatsapp',
    to: params.phone,
    type: 'template',
    template: {
      name: 'booking_confirmed',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: params.turfName },
            { type: 'text', text: params.date },
            { type: 'text', text: `${params.startTime} - ${params.endTime}` },
            { type: 'text', text: `₹${params.amount}` },
          ],
        },
      ],
    },
  }),

  booking_cancelled: (params) => ({
    messaging_product: 'whatsapp',
    to: params.phone,
    type: 'template',
    template: {
      name: 'booking_cancelled',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: params.turfName },
            { type: 'text', text: params.date },
          ],
        },
      ],
    },
  }),

  booking_reminder: (params) => ({
    messaging_product: 'whatsapp',
    to: params.phone,
    type: 'template',
    template: {
      name: 'booking_reminder',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: params.turfName },
            { type: 'text', text: params.date },
            { type: 'text', text: params.startTime },
          ],
        },
      ],
    },
  }),

  payment_received: (params) => ({
    messaging_product: 'whatsapp',
    to: params.phone,
    type: 'template',
    template: {
      name: 'payment_received',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: `₹${params.amount}` },
          ],
        },
      ],
    },
  }),

  // Fallback: send a plain text message
  _text: (params) => ({
    messaging_product: 'whatsapp',
    to: params.phone,
    type: 'text',
    text: { body: params.message || 'Hello from TurfManager!' },
  }),
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL')
    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN')

    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { phone, template, params } = await req.json()

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone for WhatsApp (add country code if missing)
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone.replace(/\D/g, '')}`

    // Build message payload
    const templateFn = TEMPLATES[template] || TEMPLATES._text
    const messagePayload = templateFn({ ...params, phone: formattedPhone })

    // Send to WhatsApp API
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', result)
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
