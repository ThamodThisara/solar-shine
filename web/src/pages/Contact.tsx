import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { fetchGlobalSettings } from '@/services/settingsService';
import { fetchCompanyInfo } from '@/services/companyService';
import { GlobalSettings, CompanyInfo } from '@/types/payload-types';

// EmailJS Service Implementation
const ContactUsFormData = {
  name: '',
  email: '',
  subject: '',
  message: ''
};

class EmailService {
  static instance = null;
  isInitialized = false;
  config = null;

  static getInstance() {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async initialize() {
    try {
      // Load EmailJS dynamically
      if (typeof window !== 'undefined' && !window.emailjs) {
        await this.loadEmailJS();
      }

      // Get configuration from environment variables
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      const toEmail = import.meta.env.VITE_TO_EMAIL || 'info@solarcompany.com';
      const companyName = import.meta.env.VITE_COMPANY_NAME || 'Solar Company';

      if (!serviceId || !templateId || !publicKey) {
        console.error('EmailJS configuration missing. Please check environment variables.');
        return false;
      }

      this.config = { serviceId, templateId, publicKey, toEmail, companyName };

      // Initialize EmailJS
      window.emailjs.init(publicKey);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return false;
    }
  }

  async loadEmailJS() {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load EmailJS'));
      document.head.appendChild(script);
    });
  }

  async sendContactEmail(formData) {
    try {
      // Validate initialization
      if (!this.isInitialized || !this.config) {
        throw new Error('Email service not initialized');
      }

      // Validate form data
      const validation = this.validateFormData(formData);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      // Prepare template parameters
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        to_email: this.config.toEmail,
        subject: formData.subject,
        message: formData.message,
        company_name: this.config.companyName,
        date: new Date().toLocaleDateString(),
        service_interest: formData.subject,
        reply_to: formData.email
      };

      // Send email using EmailJS
      const response = await window.emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        templateParams
      );

      if (response.status === 200) {
        return {
          success: true,
          message: 'Your message has been sent successfully! We\'ll get back to you within 24 hours.'
        };
      } else {
        throw new Error('Failed to send email');
      }

    } catch (error) {
      console.error('Email sending failed:', error);

      // Fallback to mailto approach
      return this.fallbackToMailto(formData);
    }
  }

  async fallbackToMailto(formData) {
    try {
      const subject = encodeURIComponent(`Contact Form: ${formData.subject}`);
      const body = encodeURIComponent(this.generateEmailBody(formData));
      const mailtoLink = `mailto:${this.config.toEmail}?subject=${subject}&body=${body}`;

      window.open(mailtoLink, '_self');

      return {
        success: true,
        message: 'Your default email client will open with the message. Please click send to complete the process.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Please send your message directly to: ${this.config.toEmail}`
      };
    }
  }

  generateEmailBody(formData) {
    return `
Dear ${this.config.companyName} Team,

I am writing to inquire about your solar services.

Contact Details:
- Name: ${formData.name}
- Email: ${formData.email}
- Service Interest: ${formData.subject}
- Date: ${new Date().toLocaleDateString()}

Message:
${formData.message}

Please contact me at your earliest convenience.

Best regards,
${formData.name}
    `.trim();
  }

  validateFormData(data) {
    if (!data.name || data.name.trim().length < 2) {
      return { isValid: false, message: 'Please enter a valid name (at least 2 characters)' };
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }

    if (!data.subject || data.subject.trim().length < 1) {
      return { isValid: false, message: 'Please select a service or enter a subject' };
    }

    if (!data.message || data.message.trim().length < 10) {
      return { isValid: false, message: 'Please enter a message (at least 10 characters)' };
    }

    return { isValid: true, message: 'Valid' };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      hasConfig: this.config !== null
    };
  }
}

// Export functions
const initializeEmailService = async () => {
  return await EmailService.getInstance().initialize();
};

const sendContactUsEmail = async (formData) => {
  return await EmailService.getInstance().sendContactEmail(formData);
};

const getEmailServiceStatus = () => {
  return EmailService.getInstance().getStatus();
};

// Contact data (in a real implementation, this would come from PayloadCMS)
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  service: z.string().min(1, { message: "Please select a service." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." })
});

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailServiceReady, setEmailServiceReady] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    type: null,
    message: ''
  });
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "",
      message: ""
    }
  });

  useEffect(() => {
    // Load global settings and company info
    const loadData = async () => {
      try {
        const [settings, company] = await Promise.all([
          fetchGlobalSettings(),
          fetchCompanyInfo()
        ]);
        setGlobalSettings(settings);
        setCompanyInfo(company);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    // Initialize email service when component mounts
    const initEmail = async () => {
      try {
        const initialized = await initializeEmailService();
        setEmailServiceReady(initialized);
        if (!initialized) {
          console.warn('EmailJS not configured, falling back to mailto');
        }
      } catch (error) {
        console.error('Failed to initialize email service:', error);
        setEmailServiceReady(false);
      }
    };

    loadData();
    initEmail();
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      // Map form data to service interface
      const contactFormData = {
        name: data.name,
        email: data.email,
        subject: data.service,
        message: data.message
      };

      // Send email using service (will use EmailJS if configured, fallback to mailto)
      const result = await sendContactUsEmail(contactFormData);

      if (result.success) {
        setSubmitStatus({
          type: 'success',
          message: result.message
        });
        form.reset(); // Clear form on success
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.message
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // Clear status message after 5 seconds
  useEffect(() => {
    if (submitStatus.type) {
      const timer = setTimeout(() => {
        setSubmitStatus({ type: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  // Dynamic contact data based on global settings and company info
  const contactData = {
    title: "Contact Us",
    subtitle: "Get in touch with our team for any inquiries about our solar services and solutions.",
    mainOffice: {
      address: globalSettings?.address || "123 Solar Street, Colombo 05, Sri Lanka",
      phone: globalSettings?.contact_phone || "+94 11 234 5678",
      email: globalSettings?.contact_email || "info@solarcompany.com",
      hours: companyInfo?.businessHours || "Monday - Friday: 8:30 AM - 5:30 PM"
    },
    locations: [
      {
        city: "Colombo",
        address: globalSettings?.address || "123 Solar Street, Colombo 05",
        phone: globalSettings?.contact_phone || "+94 11 234 5678"
      },
      {
        city: "Kandy",
        address: "45 Hill Road, Kandy",
        phone: globalSettings?.contact_phone || "+94 81 234 5678"
      },
      {
        city: "Galle",
        address: "78 Beach Road, Galle",
        phone: globalSettings?.contact_phone || "+94 91 234 5678"
      }
    ],
    formTitle: "Send Us a Message",
    formSubtitle: "Fill out the form below and our team will get back to you within 24 hours.",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126743.58585869027!2d79.7861542!3d6.9218374!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae253d10f7a7003%3A0x320b2e4d32d3838d!2sColombo%2C%20Sri%20Lanka!5e0!3m2!1sen!2sus!4v1681631456018!5m2!1sen!2sus"
  };

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen">
        <section className="py-16 px-4">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-6">{contactData.title}</h1>
              <p className="text-xl text-brand-gray max-w-3xl mx-auto mb-12">
                {contactData.subtitle}
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="md:col-span-2 flex justify-center"
              >
                <div className="max-w-2xl w-full">
                  <h2 className="text-3xl font-bold mb-2 text-center">{contactData.formTitle}</h2>
                  <p className="text-brand-gray mb-8 text-center">{contactData.formSubtitle}</p>

                  {/* Status Message */}
                  {submitStatus.type && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg mb-6 ${submitStatus.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                        }`}
                    >
                      {submitStatus.message}
                    </motion.div>
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} disabled={isSubmitting} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe@example.com" {...field} disabled={isSubmitting} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+94 XX XXX XXXX" {...field} disabled={isSubmitting} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="service"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Interested In</FormLabel>
                              <FormControl>
                                <select
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                  disabled={isSubmitting}
                                >
                                  <option value="">Select a service</option>
                                  <option value="Residential Solar">Residential Solar</option>
                                  <option value="Commercial Solar">Commercial Solar</option>
                                  <option value="Industrial Solar">Industrial Solar</option>
                                  <option value="Maintenance & Support">Maintenance & Support</option>
                                  <option value="Energy Consultation">Energy Consultation</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <textarea
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Please provide details about your project or inquiry..."
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primary text-black px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Message
                            <Send className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </Form>
                </div>
              </motion.div>

              {/* Map */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                {/* Our Locations Section - Commented Out
                <h2 className="text-3xl font-bold mb-2">Our Locations</h2>
                <p className="text-brand-gray mb-8">Visit us at one of our offices across Sri Lanka.</p>
                */}

                {/* Map Section - Commented Out
                <div className="rounded-lg overflow-hidden shadow-lg h-[400px]">
                  <iframe
                    src={contactData.mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Company office locations"
                  ></iframe>
                </div>
                */}

                {/* Branch Locations Section - Commented Out
                <div className="mt-8 grid gap-4">
                  {contactData.locations.map((location, index) => (
                    <div key={index} className="flex items-start p-3 border-l-4 border-primary">
                      <div>
                        <h3 className="font-bold">{location.city} Office</h3>
                        <p className="text-brand-gray mb-1">{location.address}</p>
                        {isLoadingSettings ? (
                          <div className="animate-pulse bg-gray-200 h-3 w-24 rounded"></div>
                        ) : (
                          <p className="text-brand-gray">{location.phone}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                */}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-brand-light to-white">
          <div className="container-custom">
            {/* Contact Info Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <Phone className="text-primary" size={28} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Phone</h3>
                    {isLoadingSettings ? (
                      <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-2"></div>
                    ) : (
                      <p className="text-brand-gray">{contactData.mainOffice.phone}</p>
                    )}
                    <a href={`tel:${contactData.mainOffice.phone}`} className="text-primary mt-2 hover:underline">
                      Call us
                    </a>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <Mail className="text-primary" size={28} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Email</h3>
                    {isLoadingSettings ? (
                      <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-2"></div>
                    ) : (
                      <p className="text-brand-gray">{contactData.mainOffice.email}</p>
                    )}
                    <a href={`mailto:${contactData.mainOffice.email}`} className="text-primary mt-2 hover:underline">
                      Email us
                    </a>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <MapPin className="text-primary" size={28} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Address</h3>
                    {isLoadingSettings ? (
                      <div className="animate-pulse bg-gray-200 h-4 w-48 rounded mb-2"></div>
                    ) : (
                      <p className="text-brand-gray">{contactData.mainOffice.address}</p>
                    )}
                    {/* Get Directions Link - Commented Out
                    <a
                      href="https://maps.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary mt-2 hover:underline"
                    >
                      Get directions
                    </a>
                    */}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <Clock className="text-primary" size={28} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Working Hours</h3>
                    <div className="text-brand-gray space-y-1">
                      <p>Monday - Friday: 8:30 AM - 5:30 PM</p>
                      <p>Saturday: 9:00 AM - 2:00 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact Form and Map Section */}

        {/* FAQ Section - Commented Out
        <section className="py-16 px-4 bg-brand-light">
          <div className="container-custom max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-brand-gray">
                Find answers to common questions about our solar services.
              </p>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg p-6 shadow-md"
              >
                <h3 className="font-bold text-lg mb-2">What areas do you service in Sri Lanka?</h3>
                <p className="text-brand-gray">
                  We provide solar installation and services across all major regions of Sri Lanka, including Colombo, Kandy, Galle, Jaffna, and surrounding areas.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white rounded-lg p-6 shadow-md"
              >
                <h3 className="font-bold text-lg mb-2">How quickly can you install a residential solar system?</h3>
                <p className="text-brand-gray">
                  Typically, the installation process takes 2-3 days for residential systems, but the entire process from initial consultation to activation can take 2-4 weeks, depending on permitting and approval processes.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white rounded-lg p-6 shadow-md"
              >
                <h3 className="font-bold text-lg mb-2">Do you offer financing options for solar installations?</h3>
                <p className="text-brand-gray">
                  Yes, we offer various financing options to make solar accessible, including partnerships with local banks, leasing arrangements, and power purchase agreements for commercial clients.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-white rounded-lg p-6 shadow-md"
              >
                <h3 className="font-bold text-lg mb-2">What maintenance do solar panels require?</h3>
                <p className="text-brand-gray">
                  Solar panels generally require minimal maintenance. Regular cleaning to remove dust and debris, and an annual inspection by our technicians is typically sufficient to ensure optimal performance.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
        */}
      </main>
      <Footer />
    </>
  );
};

export default Contact;