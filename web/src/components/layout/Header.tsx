
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanyInfo } from '@/services/companyService';

// Fallback logo if no company logo is set
const FALLBACK_LOGO = "/placeholder.svg";

const menuItems = [
  { title: 'Home', path: '/' },
  { title: 'Who We Are', path: '/who-we-are' },
  { title: 'What We Do', path: '/what-we-do' },
  { title: 'Services', path: '/services' },
  { title: 'Projects', path: '/projects' },
  { title: 'Blog', path: '/blog' },
  { title: 'Contact Us', path: '/contact' },
];

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Function to scroll to appointment section
  const scrollToAppointment = () => {
    // Check if we're on the home page
    if (window.location.pathname === '/') {
      // On home page, scroll to appointment section
      const appointmentSection = document.getElementById('appointment-section');
      if (appointmentSection) {
        const headerHeight = 80; // Approximate header height
        const elementPosition = appointmentSection.offsetTop - headerHeight;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    } else {
      // On other pages, navigate to home page and scroll to appointment section
      window.location.href = '/#appointment-section';
    }
  };

  // Add custom CSS animation for background zoom effect
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slowZoom {
        0% { transform: scale(1); }
        100% { transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch company info to get the logo
  const { data: companyInfo } = useQuery({
    queryKey: ['companyInfo'],
    queryFn: fetchCompanyInfo,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle hash navigation to appointment section
  useEffect(() => {
    if (window.location.hash === '#appointment-section') {
      const appointmentSection = document.getElementById('appointment-section');
      if (appointmentSection) {
        setTimeout(() => {
          const headerHeight = 80; // Approximate header height
          const elementPosition = appointmentSection.offsetTop - headerHeight;
          window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
          });
        }, 100); // Small delay to ensure page is fully loaded
      }
    }
  }, []);

  // Use company logo if available, otherwise fallback
  const logoUrl = companyInfo?.logo_url || FALLBACK_LOGO;
  const companyName = companyInfo?.name || 'Solar Services';

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4 border-b border-white/20'}`}>
      {/* Background Image with Overlay */}
      <div className={`absolute  inset-0 transition-all duration-300 ${scrolled ? 'opacity-0 bg-white' : 'opacity-100'}`}>
        {/* <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`,
            animation: 'slowZoom 20s ease-in-out infinite alternate'
          }}
        /> */}
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/10 backdrop-blur-sm" />
      </div>

      <div className="container-custom mx-auto flex justify-between items-center relative z-10">
        {/* Logo */}
        <Link to="/" className="z-50">
          <img
            src={logoUrl}
            alt={`${companyName} Logo`}
            className={`w-auto h-10 sm:h-12 bg-white rounded-sm transition-all duration-300 ${!scrolled ? 'drop-shadow-lg' : ''}`}
            onError={(e) => {
              // If company logo fails to load, fallback to placeholder
              const target = e.target as HTMLImageElement;
              target.src = FALLBACK_LOGO;
            }}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex space-x-4 xl:space-x-6 items-center">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              to={item.path}
              className={`font-medium transition-colors ${scrolled ? 'text-brand-dark hover:text-primary' : 'text-white hover:text-primary drop-shadow-sm'}`}
            >
              {item.title}
            </Link>
          ))}
          <Button
            className={`${scrolled ? 'btn-primary' : 'bg-white text-brand-dark hover:bg-gray-100'}`}
            onClick={scrollToAppointment}
          >
            Book Appointment
          </Button>
        </nav>

        {/* Mobile Navigation Toggle */}
        <button
          className={`lg:hidden z-50 transition-colors ${scrolled ? 'text-brand-dark' : 'text-white'}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Navigation Menu */}
        <div
          className={`fixed inset-0 bg-white p-6 transition-transform transform duration-300 ease-in-out lg:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
            } z-40 flex flex-col overflow-y-auto`}
        >
          <div className="mt-20 flex flex-col space-y-6">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                to={item.path}
                className="text-xl font-medium text-brand-dark hover:text-primary py-2 border-b border-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.title}
              </Link>
            ))}
            <Button
              className="btn-primary w-full mt-4"
              onClick={() => {
                setIsMenuOpen(false);
                scrollToAppointment();
              }}
            >
              Book Appointment
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
