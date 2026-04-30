/*
* The People's Elbow - Mutual Aid Massage
* Main JavaScript File
*/

document.addEventListener('DOMContentLoaded', function() {
    // Worker endpoint for form submissions
    const WORKER_URL = 'https://peoples-elbow.alex-adamczyk.workers.dev';

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
                const response = await fetch(WORKER_URL, {
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
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const btnText = submitButton.querySelector('span');
            const spinner = submitButton.querySelector('.loading-spinner');
            const originalButtonText = btnText?.textContent;
            if (btnText) btnText.textContent = 'Sending...';
            if (spinner) spinner.style.display = 'inline-block';
            submitButton.disabled = true;

            try {
                const formData = new FormData(contactForm);
                const response = await fetch(WORKER_URL, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    showFormMessage(contactForm, data.message, 'success');
                    contactForm.reset();
                } else {
                    showFormMessage(contactForm, data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showFormMessage(contactForm, 'There was an error sending your message. Please try again later.', 'error');
            } finally {
                if (btnText) btnText.textContent = originalButtonText;
                if (spinner) spinner.style.display = 'none';
                submitButton.disabled = false;
            }
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

    // Upcoming appearances. Featured slot = next firm-dated event, ticks live.
    // List slot = remaining future events. When featured passes, next event auto-promotes.
    const upcomingEvents = [
        {
            name: 'Rock the Block Party',
            where: 'with Stauffer Chiropractic',
            when: 'Sun May 17, 2026 &middot; 1 PM',
            date: new Date('2026-05-17T17:00:00Z'),
            cause: null,
        },
        {
            name: 'Murph Memorial Workout',
            where: 'at Hustle House Gym',
            when: 'Sat May 23, 2026 &middot; 9 AM',
            date: new Date('2026-05-23T13:00:00Z'),
            cause: 'Honoring fallen service members',
        },
        {
            name: 'FlexFest',
            where: 'Downtown Woodstock',
            when: 'Mid-Aug 2026 &middot; TBC',
            date: new Date('2026-08-15T16:00:00Z'),
            cause: null,
        },
        {
            name: 'Golfing for Respite',
            where: 'Iron Horse Golf Club, Milton GA',
            when: 'Mon Oct 5, 2026 &middot; 9 AM',
            date: new Date('2026-10-05T13:00:00Z'),
            cause: 'Benefiting Special Needs Respite (501c3)',
        },
    ];

    const featured = document.getElementById('featured-event');
    const list = document.getElementById('upcoming-events');

    if (featured && list) {
        let tickInterval = null;

        function renderFeatured(ev) {
            featured.innerHTML =
                `<div class="countdown-event-info">` +
                    `<span class="countdown-event-overline">Up Next</span>` +
                    `<span class="countdown-event-name">${ev.name}</span>` +
                    `<span class="countdown-event-when">${ev.when}</span>` +
                    `<span class="countdown-event-where">${ev.where}</span>` +
                    (ev.cause ? `<span class="countdown-event-cause">${ev.cause}</span>` : '') +
                `</div>` +
                `<div class="countdown-timer" id="countdown-timer">` +
                    `<div class="countdown-unit"><span class="countdown-number" id="countdown-days">--</span><span class="countdown-label">Days</span></div>` +
                    `<div class="countdown-unit"><span class="countdown-number" id="countdown-hours">--</span><span class="countdown-label">Hours</span></div>` +
                    `<div class="countdown-unit"><span class="countdown-number" id="countdown-minutes">--</span><span class="countdown-label">Minutes</span></div>` +
                    `<div class="countdown-unit"><span class="countdown-number" id="countdown-seconds">--</span><span class="countdown-label">Seconds</span></div>` +
                `</div>`;
        }

        function renderList(events) {
            if (!events.length) {
                list.innerHTML = '';
                return;
            }
            const header = `<li class="upcoming-events-header">Also On The Calendar</li>`;
            const items = events.map(ev =>
                `<li class="upcoming-event">` +
                    `<span class="upcoming-event-when">${ev.when}</span>` +
                    `<span class="upcoming-event-name">${ev.name}</span>` +
                    `<span class="upcoming-event-where">${ev.where}</span>` +
                    (ev.cause ? `<span class="upcoming-event-cause">${ev.cause}</span>` : '') +
                `</li>`
            ).join('');
            list.innerHTML = header + items;
        }

        function selectAndRender() {
            if (tickInterval) {
                clearInterval(tickInterval);
                tickInterval = null;
            }

            const now = new Date();
            const future = upcomingEvents
                .filter(e => !e.date || e.date > now)
                .sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return a.date - b.date;
                });

            const featuredEvent = future.find(e => e.date);
            const rest = future.filter(e => e !== featuredEvent);

            if (featuredEvent) {
                renderFeatured(featuredEvent);
                startTimer(featuredEvent);
            } else if (future.length) {
                featured.innerHTML =
                    `<p class="countdown-live">DATES TO BE ANNOUNCED</p>` +
                    `<p class="countdown-sub">CHECK BACK SOON</p>`;
            } else {
                featured.innerHTML =
                    `<p class="countdown-live">NO UPCOMING APPEARANCES</p>` +
                    `<p class="countdown-sub">STAY TUNED</p>`;
            }

            renderList(rest);
        }

        function startTimer(ev) {
            function tick() {
                const diff = ev.date - new Date();
                if (diff <= 0) {
                    selectAndRender();
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
            tick();
            tickInterval = setInterval(tick, 1000);
        }

        selectAndRender();
    }
});