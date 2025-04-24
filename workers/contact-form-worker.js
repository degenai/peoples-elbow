/**
 * The People's Elbow - Contact Form Worker
 * 
 * This Cloudflare Worker handles the contact form submissions,
 * sending the data via email to The People's Elbow team.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Handle the request
 * @param {Request} request
 */
async function handleRequest(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Get the form data
  const formData = await request.formData()
  
  // Extract form fields
  const name = formData.get('name')
  const email = formData.get('email')
  const message = formData.get('contact-message')
  
  // Validate required fields
  if (!name || !email || !message) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Please fill in all required fields'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    })
  }
  
  // Format the email content
  const emailContent = `
    New Contact Form Submission

    Name: ${name}
    Email: ${email}
    
    Message:
    ${message}
  `
  
  try {
    // Send email using Cloudflare Email Workers (you'll need to set this up)
    await sendEmail({
      to: 'peoples.elbow.massage@gmail.com',
      from: 'contact@peoples-elbow.com',
      subject: `New Contact Form: ${name}`,
      text: emailContent
    })
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Your message has been sent! We\'ll get back to you soon.'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://peoples-elbow.com'
      }
    })
  } catch (error) {
    // Return error response
    return new Response(JSON.stringify({
      success: false,
      message: 'There was an error sending your message. Please try again later.'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://peoples-elbow.com'
      },
      status: 500
    })
  }
}

/**
 * Send an email using Cloudflare Email Workers
 * Note: This function requires setting up Cloudflare Email Workers
 */
async function sendEmail({ to, from, subject, text }) {
  // This is a placeholder for the actual email sending logic
  // You'll need to replace this with Cloudflare's Email Workers or another email service
  
  // For now, we'll log the email content for testing
  console.log('Email Content:', { to, from, subject, text })
  
  // In a real implementation, you would make an API call to an email service
  // This could be Cloudflare Email Workers, SendGrid, Mailgun, etc.
  
  // Return success for now
  return true
}
