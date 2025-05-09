/**
 * The People's Elbow - Calendar Application
 * This file handles the calendar setup and interaction
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize version number display
    updateVersionNumber();
    
    // Calendar configuration
    const calendarEl = document.getElementById('calendar');
    
    // Create sample events (this would normally come from your database)
    const events = [
        {
            id: '1',
            start: '2025-05-10T10:00:00',
            end: '2025-05-10T12:00:00',
            title: 'Available: Card Shop Downtown',
            classNames: ['available'],
            location: 'Fantasy Card Shop, 123 Main St',
            extendedProps: {
                type: 'available',
                description: 'Massage sessions available at Fantasy Card Shop'
            }
        },
        {
            id: '2',
            start: '2025-05-12T14:00:00',
            end: '2025-05-12T17:00:00',
            title: 'Available: Community Center',
            classNames: ['available'],
            location: 'Community Resource Center, 456 Oak Ave',
            extendedProps: {
                type: 'available',
                description: 'Massage sessions available at the Community Center'
            }
        },
        {
            id: '3',
            start: '2025-05-15T11:00:00',
            end: '2025-05-15T13:00:00',
            title: 'Booked: Farmers Market',
            classNames: ['booked'],
            location: 'Downtown Farmers Market',
            extendedProps: {
                type: 'booked',
                description: 'Fully booked session at the Farmers Market'
            }
        },
        {
            id: '4',
            start: '2025-05-20T15:00:00',
            end: '2025-05-20T18:00:00',
            title: 'Special: Community Fair',
            classNames: ['special'],
            location: 'Central Park',
            extendedProps: {
                type: 'special',
                description: 'Special community event with multiple massage stations'
            }
        }
    ];

    // Initialize the calendar with Event Calendar from UNPKG
    // This API is compatible with a future upgrade to FullCalendar if needed
    const calendar = new EventCalendar(calendarEl, {
        view: 'dayGridMonth',
        headerToolbar: {
            start: 'today prev,next',
            center: 'title',
            end: 'dayGridMonth,timeGridWeek,listMonth'
        },
        events: events,
        eventClick: function(info) {
            handleEventClick(info.event);
        },
        datesSet: function(info) {
            // This would be a good place to fetch events for the current date range
            console.log('Calendar date range changed:', info.start, info.end);
            // In the future: fetchEvents(info.start, info.end);
        }
    });

    // Handle view buttons
    document.getElementById('month-view').addEventListener('click', function() {
        setActiveView('month-view');
        calendar.setOption('view', 'dayGridMonth');
    });

    document.getElementById('week-view').addEventListener('click', function() {
        setActiveView('week-view');
        calendar.setOption('view', 'timeGridWeek');
    });

    document.getElementById('list-view').addEventListener('click', function() {
        setActiveView('list-view');
        calendar.setOption('view', 'listMonth');
    });

    // Booking form functionality
    const bookingForm = document.getElementById('booking-form');
    const requestSection = document.getElementById('request-form');

    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(bookingForm);
        submitBookingRequest(formData);
    });

    document.querySelector('.form-close').addEventListener('click', function() {
        requestSection.classList.add('hide');
    });

    // Helper functions
    function handleEventClick(event) {
        // Only show booking form for available events
        if (event.extendedProps.type === 'available') {
            // Populate form with event details
            document.getElementById('event-id').value = event.id;
            
            // Show the booking request form
            requestSection.classList.remove('hide');
        } else {
            // Just show info for booked or special events
            alert(`${event.title}\nLocation: ${event.extendedProps.location || 'TBD'}\n${event.extendedProps.description || ''}`);
        }
    }

    async function submitBookingRequest(formData) {
        try {
            // Convert FormData to JSON
            const data = Object.fromEntries(formData.entries());
            
            // Show loading state
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            
            // In a real implementation, this would send data to your Cloudflare Worker
            // const response = await fetch('https://peoples-elbow.alex-adamczyk.workers.dev/calendar-booking', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify(data)
            // });
            
            // For demo purposes, simulate a successful response
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // if (!response.ok) throw new Error('Failed to submit booking request');
            // const result = await response.json();
            
            // Reset form and hide
            bookingForm.reset();
            requestSection.classList.add('hide');
            
            // Show success message
            alert('Your booking request has been submitted! We will contact you soon to confirm.');
            
            // Restore button state
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            
        } catch (error) {
            console.error('Error submitting booking:', error);
            alert('There was a problem submitting your booking. Please try again or contact us directly.');
            
            // Restore button state
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Request';
        }
    }

    function setActiveView(viewId) {
        // Remove active class from all view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected button
        document.getElementById(viewId).classList.add('active');
    }

    function updateVersionNumber() {
        // Update version number if available
        if (window.PEOPLES_ELBOW_VERSION_DATA) {
            const versionElements = document.querySelectorAll('.version-number, #version-number');
            versionElements.forEach(el => {
                el.textContent = window.PEOPLES_ELBOW_VERSION_DATA.version;
            });
        }
    }

    // In a real implementation, this would fetch events from your Cloudflare Worker
    async function fetchEvents(start, end) {
        try {
            // Format dates for API request
            const startStr = start.toISOString();
            const endStr = end.toISOString();
            
            // const response = await fetch(`https://peoples-elbow.alex-adamczyk.workers.dev/calendar-events?start=${startStr}&end=${endStr}`);
            // if (!response.ok) throw new Error('Failed to fetch events');
            // const events = await response.json();
            
            // Update calendar with new events
            // calendar.setOption('events', events);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    }
});
