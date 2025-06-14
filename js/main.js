/*
* The People's Elbow - Mutual Aid Massage
* Main JavaScript File
*/

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav ul');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('mobile-menu-active');
        });
        
        // Reset menu state on window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                // Desktop view - remove mobile classes and inline styles
                navMenu.classList.remove('mobile-menu-active');
                navMenu.style.display = '';
            }
        });
    }
    
    // Form submission handlers
    const hostForm = document.getElementById('host-interest-form');
    const contactForm = document.getElementById('contact-form');
    
    if (hostForm) {
        hostForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = hostForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            try {
                // Create FormData object
                const formData = new FormData(hostForm);
                
                // Send to Cloudflare Worker
                const response = await fetch('https://peoples-elbow.alex-adamczyk.workers.dev', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                
                // Show success message
                if (data.success) {
                    showFormMessage(hostForm, data.message, 'success');
                    hostForm.reset();
                } else {
                    showFormMessage(hostForm, data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showFormMessage(hostForm, 'There was an error sending your request. Please try again later.', 'error');
            } finally {
                // Restore button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            // Create FormData object
            const formData = new FormData(contactForm);
            
            // Send to Cloudflare Worker
            fetch('https://peoples-elbow.alex-adamczyk.workers.dev', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Show success message
                if (data.success) {
                    showFormMessage(contactForm, data.message, 'success');
                    contactForm.reset();
                } else {
                    showFormMessage(contactForm, data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showFormMessage(contactForm, 'There was an error sending your message. Please try again later.', 'error');
            })
            .finally(() => {
                // Restore button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            });
        });
    }
    
    // Helper function to show form messages
    function showFormMessage(form, message, type) {
        // Remove any existing message
        const existingMessage = form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `form-message ${type}`;
        messageElement.textContent = message;
        
        // Insert after the submit button
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.parentNode.insertBefore(messageElement, submitButton.nextSibling);
        
        // Remove message after 5 seconds if it's a success message
        if (type === 'success') {
            setTimeout(() => {
                messageElement.classList.add('fade-out');
                setTimeout(() => messageElement.remove(), 500);
            }, 5000);
        }
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for the sticky header
                    behavior: 'smooth'
                });
                
                // Update URL without page reload
                history.pushState(null, null, targetId);
            }
        });
    });
    
    // Simple animation for stats in the impact section
    function animateStats() {
        const stats = document.querySelectorAll('.stat-number');
        if (stats.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    // Skip animation if the content is "TBD"
                    if (target.textContent.trim() === 'TBD') {
                        observer.unobserve(target);
                        return;
                    }
                    
                    const finalValue = parseInt(target.textContent);
                    let currentValue = 0;
                    
                    // Simple animation
                    const interval = setInterval(() => {
                        currentValue++;
                        target.textContent = currentValue;
                        
                        if (currentValue >= finalValue) {
                            clearInterval(interval);
                        }
                    }, 20);
                    
                    observer.unobserve(target);
                }
            });
        }, { threshold: 0.5 });
        
        stats.forEach(stat => {
            observer.observe(stat);
        });
    }
    
    // Call animation function
    animateStats();
    
    // Version number update - fetch from authoritative D1 database
    async function updateVersionNumber() {
        const headerVersionElement = document.getElementById('header-version-number');
        if (!headerVersionElement) return;
        
        try {
            // Fetch from the same D1 API that the changelog uses
            const response = await fetch('https://changelog-reader.alex-adamczyk.workers.dev/api/changelog?page=0&limit=1');
            const data = await response.json();
            
            if (data.success && data.pagination && data.pagination.total) {
                const version = data.pagination.total;
                headerVersionElement.textContent = version;
                // Header version updated from D1 database
            } else {
                throw new Error('Invalid D1 response format');
            }
        } catch (error) {
            console.warn('Failed to fetch D1 version:', error);
            // Don't fall back to incorrect local data - show error state instead
            headerVersionElement.textContent = 'v?';
            headerVersionElement.style.opacity = '0.6';
                            // Header version showing error state due to D1 API failure
        }
    }
    
    // Try to update version immediately
    updateVersionNumber();
});