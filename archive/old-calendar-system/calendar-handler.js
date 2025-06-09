/**
 * The People's Elbow - Calendar Handler Extension
 * This extends the host-form-worker.js with calendar functionality
 * 
 * To use this, import the functions into your main worker file
 */

// Helper function for generating UUIDs for events and bookings
function generateUUID() {
  return crypto.randomUUID();
}

// Format date to ISO string
function formatDateISO(date) {
  return new Date(date).toISOString();
}

// Process calendar events to the client-friendly format
function processCalendarEvent(event) {
  let customProps = {};
  
  try {
    if (event.custom_props) {
      customProps = JSON.parse(event.custom_props);
    }
  } catch (error) {
    console.error('Error parsing custom props:', error);
  }
  
  return {
    id: event.id,
    title: event.title,
    start: event.start_time,
    end: event.end_time,
    location: event.location,
    classNames: [event.status],
    extendedProps: {
      type: event.status,
      description: event.description,
      ...customProps
    }
  };
}

// Create Calendar Events Handler
export async function handleCalendarEvents(request, env) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    
    if (!start || !end) {
      return new Response(JSON.stringify({ 
        error: 'Missing start or end date parameters' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Query the database for events in the date range
    const stmt = env.DB.prepare(`
      SELECT * FROM calendar_events 
      WHERE start_time >= ? AND end_time <= ?
      ORDER BY start_time ASC
    `).bind(start, end);
    
    const result = await stmt.all();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Process events into client format
    const events = result.results.map(processCalendarEvent);
    
    return new Response(JSON.stringify(events), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch calendar events',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Create Booking Handler
export async function handleCalendarBooking(request, env) {
  try {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed' 
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse the request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.eventId || !data.name || !data.email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: eventId, name, and email are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if the event exists and is available
    const eventStmt = env.DB.prepare(`
      SELECT * FROM calendar_events WHERE id = ? AND status = 'available'
    `).bind(data.eventId);
    
    const eventResult = await eventStmt.first();
    
    if (!eventResult) {
      return new Response(JSON.stringify({ 
        error: 'Event not found or not available for booking' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate a unique ID for the booking
    const bookingId = generateUUID();
    const now = formatDateISO(new Date());
    
    // Insert the booking into the database
    const insertStmt = env.DB.prepare(`
      INSERT INTO calendar_bookings (
        id, event_id, name, email, phone, message, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
      bookingId,
      data.eventId,
      data.name,
      data.email,
      data.phone || null,
      data.message || null,
      now,
      now
    );
    
    const insertResult = await insertStmt.run();
    
    if (insertResult.error) {
      throw new Error(insertResult.error);
    }
    
    // Update the event status to 'booked'
    const updateStmt = env.DB.prepare(`
      UPDATE calendar_events SET status = 'booked', updated_at = ? WHERE id = ?
    `).bind(now, data.eventId);
    
    await updateStmt.run();
    
    // Send email notification
    await sendBookingEmail(env, {
      to: 'peoples.elbow.massage@gmail.com',
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      eventDetails: eventResult
    });
    
    // Send confirmation email to the customer
    await sendBookingConfirmationEmail(env, {
      to: data.email,
      name: data.name,
      eventDetails: eventResult
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      bookingId: bookingId,
      message: 'Booking request submitted successfully' 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing booking request:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process booking request',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Create a new calendar event (for admin use)
export async function handleCreateEvent(request, env) {
  try {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed' 
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse the request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.start || !data.end) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: title, start, and end are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate a unique ID for the event
    const eventId = generateUUID();
    const now = formatDateISO(new Date());
    
    // Create JSON string for custom props if provided
    let customProps = null;
    if (data.extendedProps && Object.keys(data.extendedProps).length > 0) {
      customProps = JSON.stringify(data.extendedProps);
    }
    
    // Insert the event into the database
    const insertStmt = env.DB.prepare(`
      INSERT INTO calendar_events (
        id, title, start_time, end_time, location, status, type,
        description, custom_props, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      data.title,
      data.start,
      data.end,
      data.location || null,
      data.status || 'available',
      data.type || 'regular',
      data.description || null,
      customProps,
      now,
      now
    );
    
    const result = await insertStmt.run();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      eventId: eventId,
      message: 'Event created successfully' 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating event:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to create event',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Email utility for booking notifications
async function sendBookingEmail(env, data) {
  try {
    // Format the event details for the email
    const eventStart = new Date(data.eventDetails.start_time).toLocaleString();
    const eventEnd = new Date(data.eventDetails.end_time).toLocaleString();
    const eventLocation = data.eventDetails.location || 'No location specified';
    
    const emailBody = `
      <h2>New Booking Request from The People's Elbow Website</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Message:</strong> ${data.message || 'No message provided'}</p>
      
      <h3>Event Details:</h3>
      <p><strong>Event:</strong> ${data.eventDetails.title}</p>
      <p><strong>Start:</strong> ${eventStart}</p>
      <p><strong>End:</strong> ${eventEnd}</p>
      <p><strong>Location:</strong> ${eventLocation}</p>
      
      <p>Log into your admin panel to confirm or reject this booking.</p>
    `;
    
    // Use EmailMessage from Cloudflare
    const message = new EmailMessage(
      'peoples.elbow.massage@gmail.com',
      `New Booking Request: ${data.name}`,
      {
        from: 'booking@peoples-elbow.com',
        to: [data.to],
        subject: `New Booking Request: ${data.name}`,
        html: emailBody,
        headers: {
          'X-Booking-Type': 'calendar',
          'X-Booking-Id': data.bookingId
        }
      }
    );
    
    // Send the email using the binding
    await env.EMAIL.send(message);
    
    return true;
  } catch (error) {
    console.error('Error sending booking email:', error);
    return false;
  }
}

// Email utility for customer confirmation
async function sendBookingConfirmationEmail(env, data) {
  try {
    // Format the event details for the email
    const eventStart = new Date(data.eventDetails.start_time).toLocaleString();
    const eventEnd = new Date(data.eventDetails.end_time).toLocaleString();
    const eventLocation = data.eventDetails.location || 'No location specified';
    
    const emailBody = `
      <h2>Your Booking Request with The People's Elbow</h2>
      <p>Hey ${data.name},</p>
      
      <p>Thanks for requesting a booking with The People's Elbow! We've received your request
      and will get back to you shortly to confirm your appointment.</p>
      
      <h3>Event Details:</h3>
      <p><strong>Event:</strong> ${data.eventDetails.title}</p>
      <p><strong>Start:</strong> ${eventStart}</p>
      <p><strong>End:</strong> ${eventEnd}</p>
      <p><strong>Location:</strong> ${eventLocation}</p>
      
      <p>If you need to make any changes or have questions, please reply to this email
      or contact us at peoples.elbow.massage@gmail.com.</p>
      
      <p>In mutual aid and solidarity,<br>
      The People's Elbow Team</p>
    `;
    
    // Use EmailMessage from Cloudflare
    const message = new EmailMessage(
      'peoples.elbow.massage@gmail.com',
      `Booking Request Received - The People's Elbow`,
      {
        from: 'booking@peoples-elbow.com',
        to: [data.to],
        subject: `Booking Request Received - The People's Elbow`,
        html: emailBody,
        headers: {
          'X-Booking-Type': 'calendar-confirmation',
          'Reply-To': 'peoples.elbow.massage@gmail.com'
        }
      }
    );
    
    // Send the email using the binding
    await env.EMAIL.send(message);
    
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
}
