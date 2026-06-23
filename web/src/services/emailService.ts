
export interface ContactUsFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export class EmailService {
  private static instance: EmailService;
  private isInitialized = false;
  private config: {
    serviceId: string;
    templateId: string;
    publicKey: string;
    toEmail: string;
    companyName: string;
  } | null = null;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async initialize(): Promise<boolean> {
    try {

      if (typeof window !== 'undefined' && !window.emailjs) {
        await this.loadEmailJS();
      }
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      const toEmail = import.meta.env.VITE_TO_EMAIL ;
      const companyName = import.meta.env.VITE_COMPANY_NAME ;

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

  private async loadEmailJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load EmailJS'));
      document.head.appendChild(script);
    });
  }

  public async sendContactEmail(formData: ContactUsFormData): Promise<{ success: boolean; message: string }> {
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
        // Additional fields for the template
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

  private async fallbackToMailto(formData: ContactUsFormData): Promise<{ success: boolean; message: string }> {
    try {
      const subject = encodeURIComponent(`Contact Form: ${formData.subject}`);
      const body = encodeURIComponent(this.generateEmailBody(formData));
      const mailtoLink = `mailto:${this.config!.toEmail}?subject=${subject}&body=${body}`;

      window.open(mailtoLink, '_self');

      return {
        success: true,
        message: 'Your default email client will open with the message. Please click send to complete the process.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Please send your message directly to: ${this.config!.toEmail}`
      };
    }
  }

  private generateEmailBody(formData: ContactUsFormData): string {
    return `
Dear ${this.config!.companyName} Team,

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

  private validateFormData(data: ContactUsFormData): { isValid: boolean; message: string } {
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public getStatus(): { initialized: boolean; hasConfig: boolean } {
    return {
      initialized: this.isInitialized,
      hasConfig: this.config !== null
    };
  }
}

// Export simple functions for easy usage
export const initializeEmailService = async (): Promise<boolean> => {
  return await EmailService.getInstance().initialize();
};

export const sendContactUsEmail = async (formData: ContactUsFormData): Promise<{ success: boolean; message: string }> => {
  return await EmailService.getInstance().sendContactEmail(formData);
};

export const getEmailServiceStatus = () => {
  return EmailService.getInstance().getStatus();
};

// Type declaration for EmailJS
declare global {
  interface Window {
    emailjs: {
      init: (publicKey: string) => void;
      send: (serviceId: string, templateId: string, templateParams: any) => Promise<{ status: number; text: string }>;
    };
  }
}