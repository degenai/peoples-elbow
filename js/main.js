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
    

    // Initialize particle effect — orbit rings + pulse rings combo
    function initParticles() {
        const container = document.getElementById('particles');
        if (!container) return;

        // — Orbit —
        const rings = [
            { r: 55,  n: 4, spd: 7,  color: '255,204,0',  size: 7 },
            { r: 95,  n: 6, spd: 13, color: '0,160,70',   size: 5 },
            { r: 138, n: 9, spd: 21, color: '0,120,200',  size: 4 },
        ];

        let css = '';
        rings.forEach((ring, ri) => {
            css += `@keyframes orb${ri} {
                from { transform: rotate(0deg) translateX(${ring.r}px) rotate(0deg); }
                to   { transform: rotate(360deg) translateX(${ring.r}px) rotate(-360deg); }
            }`;
        });

        // — Pulse rings —
        css += `@keyframes pulse {
            0%   { transform: translate(-50%,-50%) scale(.05); opacity:0; }
            8%   { opacity:.7; }
            100% { transform: translate(-50%,-50%) scale(2.4); opacity:0; }
        }`;

        const styleEl = document.createElement('style');
        styleEl.textContent = css;
        document.head.appendChild(styleEl);

        // Orbit particles
        const center = document.createElement('div');
        center.style.cssText = 'position:absolute;top:50%;left:50%;width:0;height:0;';
        container.appendChild(center);

        rings.forEach((ring, ri) => {
            for (let i = 0; i < ring.n; i++) {
                const delay = -((ring.spd / ring.n) * i);
                const size = ring.size;
                const p = document.createElement('div');
                p.style.cssText = `
                    position:absolute;
                    width:${size}px; height:${size}px;
                    margin:${-size/2}px;
                    background:radial-gradient(circle, rgba(${ring.color},.95) 0%, rgba(${ring.color},.25) 65%, transparent 100%);
                    border-radius:50%;
                    box-shadow:0 0 ${size*2}px rgba(${ring.color},.65);
                    animation:orb${ri} ${ring.spd}s ${delay}s linear infinite;
                `;
                center.appendChild(p);
            }
        });

        // Pulse rings
        const palette = ['206,156,0', '0,105,55', '0,100,180', '206,156,0', '0,140,60', '50,150,220'];
        palette.forEach((c, i) => {
            const ring = document.createElement('div');
            ring.style.cssText = `
                position:absolute; top:50%; left:50%;
                width:160px; height:160px;
                border:2px solid rgba(${c},0.65);
                border-radius:50%;
                animation:pulse 3s ${(i * 0.5).toFixed(1)}s ease-out infinite;
                animation-fill-mode:backwards;
            `;
            container.appendChild(ring);
        });
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