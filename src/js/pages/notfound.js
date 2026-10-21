import { boot } from '../main.js';
import '../../styles/notfound.css';
import { gsap, reduceMotion } from '../core/motion.js';

boot({
  intro() {
    if (reduceMotion) return;
    gsap.from('.nf-num span', { scale: 0.3, rotate: -20, opacity: 0, duration: 1.1, ease: 'back.out(2.4)' });
    gsap.from('.nf-title, .nf-inner .lead, .nf-ctas', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.25 });
    gsap.to('.nf-num span', { rotate: 4, yoyo: true, repeat: -1, duration: 1.6, ease: 'sine.inOut', delay: 1.2 });
  },
});
