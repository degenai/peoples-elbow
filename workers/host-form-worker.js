/**
 * The People's Elbow - Host Connection Form Worker
 * 
 * This Cloudflare Worker handles both host connection and contact form submissions,
 * processing the data and responding with success/error messages.
 */

addEventListener('fetch', event => {
  // Handle CORS preflight requests
  if (event.request.method === 'OPTIONS') {
    return event.respondWith(handleCors());
  }
  event.respondWith(handleRequest(event.request))
})

/**
 * Handle CORS preflight requests
 */
function handleCors() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * Handle the request
 * @param {Request} request
 */
async function handleRequest(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get the form data
    const formData = await request.formData()
    
    // Determine which form was submitted based on field names
    const isHostForm = formData.has('venue-name');
    
    if (isHostForm) {
      return handleHostForm(formData);
    } else {
      return handleContactForm(formData);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return errorResponse('There was an error processing your request. Please try again later.');
  }
}

/**
 * Handle host connection form submissions
 */
async function handleHostForm(formData) {
  // Extract form fields
  const venueName = formData.get('venue-name')
  const contactName = formData.get('contact-name')
  const contactEmail = formData.get('contact-email')
  const venueType = formData.get('venue-type')
  const message = formData.get('message') || 'No message provided'
  
  // Validate required fields
  if (!venueName || !contactName || !contactEmail || !venueType) {
    return errorResponse('Please fill in all required fields', 400);
  }
  
  // Format the email content
  const emailContent = `
    New Host Connection Request

    Venue Name: ${venueName}
    Contact Name: ${contactName}
    Contact Email: ${contactEmail}
    Venue Type: ${venueType}
    
    Message:
    ${message}
  `
  
  // Log the submission for now (until email is set up)
  console.log('Host Form Submission:', emailContent);
  
  // Return success response
  return successResponse('Your hosting request has been received! We\'ll be in touch soon.');
}

/**
 * Handle contact form submissions
 */
async function handleContactForm(formData) {
  // Extract form fields
  const name = formData.get('name')
  const email = formData.get('email')
  const message = formData.get('contact-message') || 'No message provided'
  
  // Validate required fields
  if (!name || !email || !message) {
    return errorResponse('Please fill in all required fields', 400);
  }
  
  // Format the email content
  const emailContent = `
    New Contact Form Submission

    Name: ${name}
    Email: ${email}
    
    Message:
    ${message}
  `
  
  // Log the submission for now (until email is set up)
  console.log('Contact Form Submission:', emailContent);
  
  // Return success response
  return successResponse('Your message has been received! We\'ll get back to you soon.');
}

/**
 * Create a success response
 */
function successResponse(message) {
  return new Response(JSON.stringify({
    success: true,
    message: message
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Create an error response
 */
function errorResponse(message, status = 500) {
  return new Response(JSON.stringify({
    success: false,
    message: message
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    status: status
  });
}
