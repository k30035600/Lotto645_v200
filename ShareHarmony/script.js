// Navigation Scroll Effect
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Reveal Animations on Scroll
const revealElements = document.querySelectorAll('.reveal');

const revealOnScroll = () => {
    const triggerBottom = window.innerHeight * 0.85;

    revealElements.forEach(el => {
        const elTop = el.getBoundingClientRect().top;

        if (elTop < triggerBottom) {
            el.classList.add('active');
        }
    });
};

// Initial call
window.addEventListener('scroll', revealOnScroll);
revealOnScroll();

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, // Navbar height offset
                behavior: 'smooth'
            });
        }
    });
});

// Interactive Stats (Counter effect - Optional enhancement)
const stats = document.querySelectorAll('.stat-number');
let started = false;

const startCounters = () => {
    stats.forEach(stat => {
        const target = parseInt(stat.innerText.replace(/[^0-9]/g, ''));
        const suffix = stat.innerText.replace(/[0-9]/g, '');
        let count = 0;
        const increment = target / 30; // Adjustment for speed

        const updateCount = () => {
            if (count < target) {
                count += increment;
                stat.innerText = Math.ceil(count) + suffix;
                setTimeout(updateCount, 20);
            } else {
                stat.innerText = target + suffix;
            }
        };
        updateCount();
    });
};

// Start counters when icon section is reached
const statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !started) {
        startCounters();
        started = true;
    }
}, { threshold: 0.5 });

const statsSection = document.querySelector('.impact-stats');
if (statsSection) {
    statsObserver.observe(statsSection);
}
