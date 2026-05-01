// Export email template components and HTML generators
export { 
  AuthCodeEmailTemplate, 
  generateAuthCodeEmailHTML 
} from './AuthCodeEmailTemplate';

export { 
  PaymentConfirmationEmailTemplate, 
  generatePaymentConfirmationEmailHTML 
} from './PaymentConfirmationEmailTemplate';

// Example usage functions for backend integration
export const sendAuthCodeEmail = async (emailProps: {
  userName: string;
  authCode: string;
  expiresInMinutes?: number;
  userEmail: string;
}) => {
  const htmlContent = generateAuthCodeEmailHTML(emailProps);
  
  // This would integrate with your email service (SendGrid, AWS SES, etc.)
  console.log('Sending auth code email:', {
    to: emailProps.userEmail,
    subject: 'Your N8N Bazar Verification Code ✨',
    html: htmlContent
  });
  
  return htmlContent;
};

export const sendPaymentConfirmationEmail = async (emailProps: {
  userName: string;
  userEmail: string;
  planName: string;
  planPrice: number;
  totalTokens: number;
  billingPeriod: "monthly" | "annually";
  transactionId: string;
  purchaseDate: Date;
  nextBillingDate: Date;
  additionalTokens?: number;
}) => {
  const htmlContent = generatePaymentConfirmationEmailHTML(emailProps);
  
  // This would integrate with your email service (SendGrid, AWS SES, etc.)
  console.log('Sending payment confirmation email:', {
    to: emailProps.userEmail,
    subject: 'Payment Confirmed - Welcome to N8N Bazar! 🎉',
    html: htmlContent
  });
  
  return htmlContent;
};

// Note: Advanced EmailTemplatePreview component is available in /components/EmailTemplatePreview.tsx