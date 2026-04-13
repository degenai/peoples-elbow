/**
 * The People's Elbow - Form Handler Worker
 *
 * Handles form submissions and sends email notifications.
 * No data is stored server-side -- submissions go straight to email.
 */

// Import statements for Workers functionality
import { EmailMessage } from 'cloudflare:email';

/**
 * Main handler for all incoming requests
 * @param {Request} request
 * @param {Env} env - Environment containing MAIL binding
 * @param {ExecutionContext} ctx - Worker execution context
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCors();
    }
    
    return handleRequest(request, env);
  }
}

/**
 * Handle CORS preflight requests
 */
function handleCors() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://peoples-elbow.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * Main request handler
 * @param {Request} request
 * @param {Env} env - Environment containing MAIL binding
 */
async function handleRequest(request, env) {
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
      return handleHostForm(formData, env);
    } else {
      return handleContactForm(formData, env);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return errorResponse('There was an error processing your request. Please try again later.');
  }
}


/**
 * Process a form submission by sending an email notification.
 * Returns success only if the email was actually sent.
 * @param {Object} options
 * @param {Object} options.env - Environment containing MAIL binding
 * @param {string} options.subject - Email subject
 * @param {string} options.emailContent - Email body
 * @param {string} options.successMessage - Message for successful response
 */
async function processFormSubmission({ env, subject, emailContent, successMessage }) {
  try {
    const sent = await sendEmail(
      'peoples.elbow.massage@gmail.com',
      subject,
      emailContent,
      env
    );

    if (!sent) {
      return errorResponse('Your message could not be sent. Please email info@peoples-elbow.com directly.');
    }

    return successResponse(successMessage);
  } catch (error) {
    console.error('Error processing form submission:', error);
    return errorResponse('Your message could not be sent. Please email info@peoples-elbow.com directly.');
  }
}

/**
 * Handle host connection form submissions
 * @param {FormData} formData
 * @param {Env} env - Environment containing MAIL binding
 */
async function handleHostForm(formData, env) {
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
  
  return processFormSubmission({
    env,
    subject: `New Host Request: ${venueName}`,
    emailContent,
    successMessage: 'Your hosting request has been received! We\'ll be in touch soon.'
  });
}

/**
 * Handle contact form submissions
 * @param {FormData} formData
 * @param {Env} env - Environment containing MAIL binding
 */
async function handleContactForm(formData, env) {
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
  
  return processFormSubmission({
    env,
    subject: `New Contact Form Message from ${name}`,
    emailContent,
    successMessage: 'Your message has been received! We\'ll get back to you soon.'
  });
}

/**
 * Send email using Cloudflare's sendEmail binding
 * @param {string} to - Recipient email address (must be pre-verified in Email Routing)
 * @param {string} subject - Email subject
 * @param {string} body - Email body content
 * @param {Object} env - Environment with MAIL binding
 */
async function sendEmail(to, subject, body, env) {
  try {
    // Log email details for debugging
    console.log('Sending email:', { to, subject });
    
    // Check if the MAIL binding exists
    if (!env || !env.MAIL) {
      console.error('Email binding not available');
      return false;
    }
    
    try {
      // Create a properly formatted raw email with headers
      const fromEmail = 'forms@peoples-elbow.com';
      const date = new Date().toUTCString();
      const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@peoples-elbow.com>`;
      
      // Format email with proper headers and MIME format
      const rawEmail = [
        `From: The People's Elbow <${fromEmail}>`,
        `To: <${to}>`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        `Date: ${date}`,
        `Message-ID: ${messageId}`,
        '',  // Empty line to separate headers from body
        body
      ].join('\r\n');
      
      // Create an EmailMessage with the raw email format
      const message = new EmailMessage(
        fromEmail,  // From address (must use your domain)
        to,         // To address (must be verified in Email Routing)
        rawEmail    // Raw email with headers and content
      );
      
      // Send the email using the binding
      await env.MAIL.send(message);
      console.log('Email sent successfully!');
      return true;
    } catch (emailError) {
      console.error('Error details from email send:', emailError);
      return false;
    }
  } catch (error) {
    console.error('Exception sending email:', error);
    return false;
  }
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
      'Access-Control-Allow-Origin': 'https://peoples-elbow.com'
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
      'Access-Control-Allow-Origin': 'https://peoples-elbow.com'
    },
    status: status
  });
}
