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
            const btnText = submitButton.querySelector('span');
            const spinner = submitButton.querySelector('.loading-spinner');
            const originalButtonText = btnText?.textContent;
            if (btnText) btnText.textContent = 'Sending...';
            if (spinner) spinner.style.display = 'inline-block';
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
                if (btnText) btnText.textContent = originalButtonText;
                if (spinner) spinner.style.display = 'none';
                submitButton.disabled = false;
            }
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const btnText = submitButton.querySelector('span');
            const spinner = submitButton.querySelector('.loading-spinner');
            const originalButtonText = btnText?.textContent;
            if (btnText) btnText.textContent = 'Sending...';
            if (spinner) spinner.style.display = 'inline-block';
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
                if (btnText) btnText.textContent = originalButtonText;
                if (spinner) spinner.style.display = 'none';
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
    

    // Initialize particle effect
    function initParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        const colors = [
            { bg: 'rgba(0, 105, 55, 0.8)', glow: '0, 105, 55' },
            { bg: 'rgba(0, 68, 102, 0.8)', glow: '0, 68, 102' },
            { bg: 'rgba(255, 204, 0, 0.9)', glow: '255, 204, 0' }
        ];
        const COUNT = 18;

        // Build all keyframes in a single style block
        let keyframes = '';
        const particles = [];

        for (let i = 0; i < COUNT; i++) {
            const angle = (Math.PI * 2 / COUNT) * i + Math.random() * 1.2;
            const distance = 200 + Math.random() * 150;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;

            keyframes += `
                @keyframes pFloat${i} {
                    0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0; }
                    15%  { transform: translate(-50%,-50%) scale(1);   opacity: 0.8; }
                    85%  { opacity: 0.6; }
                    100% { transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.3); opacity: 0; }
                }
            `;
            particles.push({ angle, endX, endY });
        }

        const styleEl = document.createElement('style');
        styleEl.textContent = keyframes;
        document.head.appendChild(styleEl);

        for (let i = 0; i < COUNT; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 8 + 4;
            const duration = 8 + Math.random() * 6;

            const p = document.createElement('div');
            p.style.cssText = `
                position: absolute;
                width: ${size}px; height: ${size}px;
                background: radial-gradient(circle, ${color.bg} 0%, rgba(${color.glow}, 0.3) 70%, transparent 100%);
                border-radius: 50%;
                left: 50%; top: 50%;
                transform: translate(-50%, -50%);
                animation: pFloat${i} ${duration}s infinite ease-out;
                box-shadow: 0 0 ${size * 2}px rgba(${color.glow}, 0.4), 0 0 ${size}px rgba(${color.glow}, 0.6);
                filter: blur(0.5px);
            `;
            particlesContainer.appendChild(p);
        }
    }

    // Initialize parallax effect
    function initParallax() {
        const photoElement = document.getElementById('parallax-photo');
        const containerElement = document.getElementById('hero-photo-container');

        if (!photoElement || !containerElement) return;

        function updateParallax() {
            const rect = containerElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Only apply parallax when the element is visible
            if (rect.bottom >= 0 && rect.top <= windowHeight) {
                // Calculate parallax offset (very subtle)
                const scrollPercent = (windowHeight - rect.top) / (windowHeight + rect.height);
                const parallaxOffset = (scrollPercent - 0.5) * 20; // Max 10px movement in either direction

                photoElement.style.transform = `translateY(${parallaxOffset}px)`;
            }
        }

        // Throttled scroll listener for performance
        let ticking = false;
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateParallax();
                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        updateParallax(); // Initial call
    }

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
    initParticles();
    initParallax();
    
    // Version number update - use centralized component loader
    async function updateVersionNumber() {
        const headerVersionElement = document.getElementById('header-version-number');
        if (!headerVersionElement) return;
        
        try {
            // Wait for componentLoader to be available if it's not already
            if (window.componentLoader && window.componentLoader.getVersion) {
                const version = await window.componentLoader.getVersion();
                headerVersionElement.textContent = version;
                // Header version updated from cached D1 database
            } else {
                // Fallback in case main.js runs before components.js
                // We'll let components.js handle the update when it loads
            }
        } catch (error) {
            console.warn('Failed to fetch version from cache:', error);
            // Don't fall back to incorrect local data - show error state instead
            headerVersionElement.textContent = 'v?';
            headerVersionElement.style.opacity = '0.6';
                            // Header version showing error state due to D1 API failure
        }
    }
    
    // Try to update version immediately
    updateVersionNumber();

    // House Wolf Records countdown — Record Store Day, April 18 2026, 8 AM EDT
    const countdownTarget = new Date('2026-04-18T12:00:00Z');
    const countdownTimer = document.getElementById('countdown-timer');

    if (countdownTimer) {
        let tickInterval = null;

        function updateCountdown() {
            const diff = countdownTarget - new Date();

            if (diff <= 0) {
                clearInterval(tickInterval);
                const elapsed = Math.abs(diff);
                const days    = Math.floor(elapsed / 864e5);
                const hours   = Math.floor((elapsed % 864e5) / 36e5);
                const minutes = Math.floor((elapsed % 36e5) / 6e4);

                let ago = '';
                if (days > 0) ago += `${days}d `;
                if (hours > 0 || days > 0) ago += `${hours}h `;
                ago += `${minutes}m`;

                countdownTimer.innerHTML =
                    `<p class="countdown-live">EVENT HAPPENED ${ago.trim()} AGO</p>` +
                    `<p class="countdown-sub">STAY TUNED FOR STATS AND MORE TIMERS</p>`;
                return;
            }

            const days    = Math.floor(diff / 864e5);
            const hours   = Math.floor((diff % 864e5) / 36e5);
            const minutes = Math.floor((diff % 36e5) / 6e4);
            const seconds = Math.floor((diff % 6e4) / 1e3);

            document.getElementById('countdown-days').textContent    = String(days).padStart(2, '0');
            document.getElementById('countdown-hours').textContent   = String(hours).padStart(2, '0');
            document.getElementById('countdown-minutes').textContent = String(minutes).padStart(2, '0');
            document.getElementById('countdown-seconds').textContent = String(seconds).padStart(2, '0');
        }

        updateCountdown();
        tickInterval = setInterval(updateCountdown, 1000);
    }
});