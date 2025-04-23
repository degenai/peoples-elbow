/*
* The People's Elbow - Mutual Aid Massage
* Main JavaScript File
*/

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav ul');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
        });
    }
    
    // Form submission handlers
    const hostForm = document.getElementById('host-interest-form');
    const contactForm = document.getElementById('contact-form');
    
    if (hostForm) {
        hostForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your interest in hosting The People\'s Elbow! This form is not yet connected to a backend. We\'ll implement this functionality soon.');
            hostForm.reset();
        });
    }
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! This form is not yet connected to a backend. We\'ll implement this functionality soon.');
            contactForm.reset();
        });
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
});